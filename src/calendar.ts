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
    rotationDay: number,
    /**
     * Day of the week, from 0 (Mon) to 6 (Sun)
     */
    weekDay: number,

}

/**
 * Returns a unique string identifier usable for object keys.
 * @param day The calendar day to be hashed.
 */
function dayKey(day: CalendarDay): string {
    return `${day.weekDay}-${day.rotationDay}`;
}

/**
 * Parses a CSV entry and returns a `CalendarDay` that represents it.
 * @param entry The CSV entry string to parse.
 */
function bridgeDay(entry: string, days: string[]): CalendarDay {
    // CSV headers are defined as:
    // Name, Date, Start, End, Notes, Details, Type
    const split = entry.split(",");
    const rotationDay = days.indexOf(split[0]);
    // The date is in US format: MM/DD/YYYY
    const rawDate = entry[1].split("/");
    const date = new Date(
        Number(rawDate[2]), 
        Number(rawDate[0]) - 1, // January is the 0th month
        Number(rawDate[1])
    );
    const weekDay = date.getDay();
    return { rotationDay, weekDay};
}

/**
 * Represents a lesson. It has a start and end time, as well as an identifier 
 * and label that are unique to `Lesson` objects of the same type.
 */
class Lesson {
    /**
     * The lesson ID, e.g. "7A".
     */
    id: string;
    /**
     * The custom label for the lesson, provided by the user.
     */
    label: string;
    /**
     * When this specific lesson begins.
     */
    startTime: Date;
    /**
     * When this specific lesson ends.
     */
    endTime: Date;
    /**
     * Create a new `Lesson` with default values. 
     * These values should be mutated later.
     */
    constructor() {
        this.id = "";
        this.label = "";
        this.startTime = new Date(0);
        this.endTime = new Date(0);
    }
} 

/**
 * Used to cache the events for a given rotation-day & week-day combination.
 */
interface LessonCache {
    [index: string]: Lesson;
}

/**
 * Converts a list of `Lesson` objects to a single iCal string.
 * @param lessons The list of lessons to convert into iCal.
 */
function makeIcal(lessons: Lesson[]) {
    let strings: string[] = [];
    // Preamble
    strings.push("BEGIN:VCALENDAR");
    strings.push("VERSION:2.0");
    strings.push("PRODID:-//RocketRace//CA Calendar Generator//EN");
    strings.push("X-WR-CALNAME:Lesson Rotation");
    // Events
    let counter = 0;
    const now = new Date();
    lessons.forEach(lesson => {
        strings.push(makeEventIcal(lesson, now, counter));
        counter += 1;
    });
    // Cleanup
    strings.push("END:VCALENDAR");
    // These have to CRLF according to the ical spec
    return strings.join("\r\n");
}

/**
 * Converts a single `Lesson` object into an iCal event string.
 * @param event The lesson to convert into an iCal string.
 */
function makeEventIcal(event: Lesson, now: Date, counter: number): string {
    let strings: string[] = [];
    strings.push("BEGIN:VEVENT");
    // This should be unique between each event, ideally between calendars too
    strings.push(`UID:${now.toISOString()}_${counter}@rocketrace.github.io`);
    // Event generation time
    strings.push(`DTSTAMP:${now.toISOString()}`);
    // Start and end times
    strings.push(`DTSTART:${event.startTime.toISOString()}`);
    strings.push(`DTEND:${event.endTime.toISOString()}`);
    // Title
    strings.push(`SUMMARY:${event.label}`);
    // May be useful
    strings.push(`CATEGORIES:Period ${event.id}`);
    // Cleanup
    strings.push("END:VEVENT");
    // These have to CRLF according to the ical spec
    return strings.join("\r\n");
}

/**
 * Generates a calendar from the given class decisions.
 */
function makeCalendar(grade: "pyp" | "myp" | "dp"): string[] | null {
    const csvFile = loadFile("/src/data/calendar.csv");
    const timesFile = loadFile("/src/data/times.json");
    const rotationFile = loadFile("/src/data/rotation.json");
    // Check whether any requests failed
    if (csvFile === null || timesFile === null || rotationFile === null) {
        alert("Could not load the calendar data! Try again later.");
        return null
    }
    // CSV source, with headers stripped
    const source = csvFile.substring(csvFile.indexOf("\n") + 1).split("\n");
    // The start & end times for each lesson per week day
    const times = JSON.parse(timesFile);
    // The lessons per rotation day
    const rotation = JSON.parse(rotationFile);
    let rawCalendar: Lesson[] = [];
    // Each cache entry is a list of Lessons
    let cache: LessonCache = {};
    source.forEach(entry => {
        let day = bridgeDay(entry, rotation.days);
        let key = dayKey(day);
        if (cache[key] === undefined) {
            for (let i = 0; i < rotation[grade].length; i++) {
                const lesson = rotation[grade][i];
                const time = times[grade][i];
                let event = new Lesson();
            }
            // Zip the rotation and times lists @ grade key
            // Create an event for each index
        }
        else {
            rawCalendar.concat(cache[key]);
        }
    });
    let calendar = makeIcal(rawCalendar);
    return null;
}

makeCalendar("dp");