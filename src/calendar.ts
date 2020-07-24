/**
 * Reads a file from the web page, and returns its response content. 
 * If not found, returns `null`.
 *
 * Reads are done synchronously. The file path is relative to the current path.
 * @param path The path to the resource.
 */
function loadFile(path: string): string | null {
    let request = new XMLHttpRequest();
    request.open("GET", path, false);
    request.send();
    if (request.status == 200) {
        return request.response;
    }
    else {
        console.log(`Failed to GET content of ${path}`)
        return null;
    }
}

/**
 * Represents a single calendar day.
 */
interface CalendarDay {
    /**
     * Rotation day, from 0 (Day 1) to 8 (Day 9)
     */
    rotationDay: string,
    /**
     * Day of the week, from 0 (Mon) to 6 (Sun)
     */
    weekDay: number,

}

/**
 * Returns a unique string identifier usable for object keys.
 * @param day The calendar day to be hashed.
 */
function eventKey(day: CalendarDay): string {
    return String(day.weekDay) + day.rotationDay;
}

/**
 * Parses a CSV entry and returns a `CalendarDay` that represents it.
 * @param entry The CSV entry string to parse.
 */
function bridgeEvent(entry: string, days: string[]): CalendarDay {
    // CSV headers are defined as:
    // Name, Date, Start, End, Notes, Details, Type
    let split = entry.split(",");
    let rotationDay = days.indexOf(split[0]);
    // The date is in US format: MM/DD/YYYY
    let rawDate = entry[1].split("/");
    let date = new Date(
        Number(rawDate[2]), 
        Number(rawDate[0]) - 1, // January is the 0th month
        Number(rawDate[1])
    );
    let weekDay = date.getDay();
    return { rotationDay: split[0], weekDay};
}

interface Lesson {

}

/**
 * Used to cache the events for a given rotation-day & week-day combination.
 */
interface LessonCache {
    [index: string]: string;
}

/**
 * Converts a list of `Lesson` objects to a single iCal string.
 * @param events The list of lessons to convert into iCal.
 */
function makeIcal(events: string[]) {

}

/**
 * Generates a calendar from the given class decisions.
 */
function makeCalendar(grade: "pyp" | "myp" | "dp"): string[] | null {
    let csvFile = loadFile("/src/data/calendar.csv");
    let timesFile = loadFile("/src/data/times.json");
    let rotationFile = loadFile("/src/data/rotation.json");
    // Check whether any requests failed
    if (csvFile === null || timesFile === null || rotationFile === null) {
        alert("Could not load the calendar data! Try again later.");
        return null
    }
    // CSV source, with headers stripped
    let source = csvFile.substring(csvFile.indexOf("\n") + 1).split("\n");
    // The start & end times for each lesson per week day
    let times = JSON.parse(timesFile);
    // The lessons per rotation day
    let rotation = JSON.parse(rotationFile);
    let rawCalendar: string[] = [];
    // Each cache entry is a list of Lessons
    let cache: LessonCache = {};
    source.forEach(entry => {
        let event = bridgeEvent(entry, rotation.days);
        let key = eventKey(event);
        if (cache[key] === undefined) {
            // Zip the rotation and times lists @ grade key
            // Create an event for each index
        }
        else {
            rawCalendar.concat(cache[key]);
        }
    });
    // rawCalendar => calendar
    let calendar = makeIcal(rawCalendar);
    return null;
}

makeCalendar("dp");