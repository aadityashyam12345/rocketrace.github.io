import * as rotation from "./data/rotation.json";
import * as times from "./data/times.json";

/* 
 * Reads a file from the web page.
 *
 * Reads are done synchronously. The file path is relative to the current path.
 */
function loadFile(path: string): string | null {
    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send();
    if (request.status == 200) {
        return request.responseText;
    }
    else {
        return null;
    }
}