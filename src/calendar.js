"use strict";function loadFile(e){var n=new XMLHttpRequest;return n.open("GET",e,!1),n.send(),200==n.status?n.response:(console.log("Failed to GET content of "+e),null)}function eventKey(e){return String(e.weekDay)+e.rotationDay}function bridgeEvent(e){var n=e.split(","),a=e[1].split("/"),t=new Date(Number(a[2]),Number(a[0])-1,Number(a[1])).getDay();return{rotationDay:n[0],weekDay:t}}function makeCalendar(e){var n=loadFile("/src/data/calendar.csv"),a=loadFile("/src/data/times.json"),t=loadFile("/src/data/rotation.json");if(null===n||null===a||null===t)return alert("Could not load the calendar data! Try again later."),null;var r=n.substring(n.indexOf("\n")+1).split("\n"),l=(JSON.parse(a),JSON.parse(t),[]),o={};return r.forEach(function(e){var n=eventKey(bridgeEvent(e));void 0===o[n]||l.push(o[n])}),null}makeCalendar("dp");