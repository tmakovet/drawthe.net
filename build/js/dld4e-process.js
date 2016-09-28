var processEntities = function (svg, drawing, objects) {

  // set some defaults, even though these won't be used for icons we'll set them anyway
  var defaults = {
    xAlign: "left",
    yAlign: "top",
    // w: 1,
    // h: 1
  }
  var previous = {}
  for(var key in objects) {
    objects[key] = Object.assign({}, defaults, objects[key])
    objects[key].w = objects[key].w || 1
    objects[key].h = objects[key].h || 1
    if (!("x" in objects[key])) {
      objects[key].x = previous.x
    } else if (objects[key].x.toString().startsWith('+')) {
      objects[key].x = parseInt(previous.x) + parseInt(objects[key].x.toString().split('+')[1])
    } else if (objects[key].x.toString().startsWith('-')) {
      objects[key].x = parseInt(previous.x) - parseInt(objects[key].x.toString().split('-')[1])
    }
    objects[key].x1 = diagram.xBand(objects[key].x)
    if (!("y" in objects[key])) {
      objects[key].y = previous.y
    } else if (objects[key].y.toString().startsWith('+')) {
      objects[key].y = parseInt(previous.y) + parseInt(objects[key].y.toString().split('+')[1])
    } else if (objects[key].y.toString().startsWith('-')) {
      objects[key].y = parseInt(previous.y) - parseInt(objects[key].y.toString().split('-')[1])
    }
    objects[key].y1 = diagram.yBand(objects[key].y)
    objects[key].width = diagram.xBand.bandwidth() + ((objects[key].w - 1) * diagram.xBand.step())
    objects[key].height = diagram.yBand.bandwidth() + ((objects[key].h - 1) * diagram.yBand.step())
    objects[key].x2 = objects[key].x1 + objects[key].width
    objects[key].y2 = objects[key].y1 + objects[key].height
    objects[key].centerX = objects[key].x1 + objects[key].width/2
    objects[key].centerY = objects[key].y1 + objects[key].height/2
    objects[key].rx = diagram.xBand.bandwidth() * .05
    objects[key].ry = diagram.yBand.bandwidth() * .05
    objects[key].padding = Math.min(diagram.yBand.bandwidth() * .05, diagram.xBand.bandwidth() * .05)
    previous = objects[key]
  }
  return objects
}

function clone(hash) {
  var json = JSON.stringify(hash);
  var object = JSON.parse(json);
  return object;
}

function diveOne(entry, objects, groups) {
  var answer = []
  if (entry in groups) {
    groups[entry].members.forEach(function(member) {
      answer = answer.concat(diveOne(member, objects, groups))
    })
  } else {
    answer.push(entry)
  }
  return answer
}
function dive(connection, objects, groups) {
  var additionalConnections = []
  var endpoints = connection.endpoints.map( function(device) { return device.split(':')[0]})
  var labels = connection.endpoints.map( function(device) { return device.split(':')[1]})
  if (endpoints[0] in groups) {
    starters = diveOne( endpoints[0], objects, groups)
  } else {
    starters = [endpoints[0]]
  }
  if (endpoints[1] in groups) {
    enders = diveOne( endpoints[1], objects, groups)
  } else {
    enders = [endpoints[1]]
  }
  starters.forEach(function(starter) {
    enders.forEach(function(ender) {
      connection.endpoints = [`${starter}:${labels[0] || ''}`,`${ender}:${labels[1] || ''}`]
      additionalConnections.push(clone(connection))
    })
  })
  return additionalConnections
}
var processConnections = function(connections, groups, objects) {
  var additionalConnections = []
  for (var i = connections.length - 1; i >= 0; i--) {
    endpoints = connections[i].endpoints.map( function(device) { return device.split(':')[0]})
    labels = connections[i].endpoints.map( function(device) { return device.split(':')[1]})
    if ((endpoints[0] in groups) || (endpoints[1] in groups)) {
      additionalConnections = additionalConnections.concat(dive(connections[i],objects,groups))
      connections.splice(i, 1);
    } //if
  }
  return connections.concat(additionalConnections)
}

var processGroups = function(groups, objects) {
  for (var key in groups) {
    var additionalMembers = []
    for (var i = groups[key].members.length - 1; i >= 0; i--) {
      if (!(groups[key].members[i] in objects)) {
        additionalMembers = additionalMembers.concat(diveOne(groups[key].members[i], objects, groups))
        groups[key].members.splice(i, 1);
      }
      groups[key].members = groups[key].members.concat(additionalMembers)
    }
    var xpad = (diagram.xBand.step() - diagram.xBand.bandwidth()) * diagram.groupPadding
    var ypad = (diagram.yBand.step() - diagram.yBand.bandwidth()) * diagram.groupPadding
    groups[key].x1 = diagram.xBand(d3.min(groups[key].members, function(d) {return objects[d].x })) - xpad
    groups[key].y1 = diagram.yBand(d3.max(groups[key].members, function(d) { return objects[d].y })) - ypad
    groups[key].x2 = d3.max(groups[key].members, function(d) { return objects[d].x2 + xpad })
    groups[key].y2 = d3.max(groups[key].members, function(d) { return objects[d].y2 + ypad })
    groups[key].width = groups[key].x2 - groups[key].x1
    groups[key].height = groups[key].y2 - groups[key].y1
  }
  return groups
}


function textPositions(x1, y1, x2, y2, xpad, ypad ) {
  var positions = {
    topLeft: { x: x1 + xpad, y: y1 + (2*ypad + ypad/2), textAnchor: "start", rotate: 0 },
    topMiddle: { x: (x2 - x1)/2 + x1 , y: y1 + (2*ypad + ypad/2), textAnchor: "middle", rotate: 0},
    topRight: { x: x2 - xpad, y: y1 + (2*ypad + ypad/2), textAnchor: "end", rotate: 0 },
    leftTop: { x: x1 + (2*xpad + xpad/2), y: y1 + ypad, textAnchor: "end", rotate: -90},
    leftMiddle: { x: x1 + (2*xpad + xpad/2), y: (y2-y1)/2 + y1, textAnchor: "middle", rotate: -90},
    leftBottom: { x: x1 + (2*xpad + xpad/2), y: y2 - ypad, textAnchor: "start", rotate: -90},
    rightTop: { x: x2 - (2*xpad + xpad/2), y: y1 + ypad, textAnchor: "start", rotate: 90},
    rightMiddle: { x: x2 - (2*xpad + xpad/2), y: (y2-y1)/2 + y1, textAnchor: "middle", rotate: 90},
    rightBottom: { x: x2 - (2*xpad + xpad/2), y: y2 - ypad, textAnchor: "end", rotate: 90},
    bottomLeft: { x: x1 + xpad, y: y2 - ypad/2, textAnchor: "start", rotate: 0 },
    bottomMiddle: { x: (x2 - x1)/2 + x1 , y: y2 - ypad/2, textAnchor: "middle", rotate: 0},
    bottomRight: { x: x2 - xpad, y: y2 - ypad/2, textAnchor: "end", rotate: 0 },
  }
  return positions
}

function textPosition(boxes) {
  for (var key in boxes) {
    var xpad = (diagram.xBand.step() - diagram.xBand.bandwidth()) * diagram.groupPadding
    var ypad = (diagram.yBand.step() - diagram.yBand.bandwidth()) * diagram.groupPadding
    var textLocation = textPositions(boxes[key].x1,boxes[key].y1,boxes[key].x2,boxes[key].y2, xpad/3, ypad/3 )[boxes[key].textLocation || 'topLeft']
    console.log(textLocation)
  }
  return (boxes)
}