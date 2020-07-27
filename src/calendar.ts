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
 * Pads a string with a character to a specified length. 
 * If the string is longer than this length, the original string is returned.
 * 
 * (hohoho no leftpad incident to see here)
 * @param str The string to pad
 * @param char The character to pad with
 * @param length The desired length of the string
 */
function leftPad(str: string, char: string, length: number): string {
    if (str.length >= length) {
        return str;
    }
    const pad = length - str.length;
    let builder = []
    for (let i = 0; i < pad; i++) {
        builder.push(char);
    }
    builder.push(str);
    return builder.join("");
}

/**
 * Formats a date into a iCal-friendly string.
 * @param date The date to be formatted.
 */
function fmtDate(date: Date): string {
    // y2k bug incoming
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const mo = leftPad(month.toString(), "0", 2);
    const dd = leftPad(day.toString(), "0", 2);
    const hh = leftPad(hours.toString(), "0", 2);
    const mm = leftPad(minutes.toString(), "0", 2);
    const ss = leftPad(seconds.toString(), "0", 2);
    return `${year}${mo}${dd}T${hh}${mm}${ss}Z`;
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
    /**
     * When this specific day occurs
     */
    date: Date
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
    const rotationDay = days.indexOf(split[0].substring(1, split[0].length - 1));
    // The date is in US format: MM/DD/YYYY
    const rawDate = split[1].substring(1, split[1].length - 1).split("/");
    const date = new Date(
        Number(rawDate[2]), 
        Number(rawDate[0]) - 1, // January is the 0th month
        Number(rawDate[1])
    );
    const weekDay = date.getDay() - 1;
    return { rotationDay, weekDay, date };
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
     * Create a new `Lesson` with the specified values.
     */
    constructor(
        id: string, 
        label: string, 
        startTime: Date,
        endTime: Date
    ) {
        this.id = id
        this.label = label
        this.startTime = startTime
        this.endTime = endTime
    }
} 

/**
 * Used to cache the events for a given rotation-day & week-day combination.
 */
interface LessonCache {
    [index: string]: Lesson;
}

/**
 * Represents the user's lesson choices.
 */
interface LessonChoices {
    [index: string]: string
}

/**
 * Represents the lesson rotation template.
 */
interface Rotation {
    /**
     * The names of each rotation day.
     */
    days: string[],
    pyp: RotationLesson[][],
    myp: RotationLesson[][],
    dp: RotationLesson[][],
}

/**
 * Represents a single day of the lesson rotation template.
 */
interface RotationLesson {
    /**
     * The lesson's identifier
     */
    id: string,
    /**
     * The lesson's label
     */
    label: string,
    /**
     * Whether or not the lesson is special
     */
    special: boolean,
}

/**
 * Represents a week of lessons, containing the length of each lesson
 * depending on the day of week.
 */
interface Week {
    /**
     * The names of each week day.
     */
    days: string[],
    pyp: LessonTimes[][],
    myp: LessonTimes[][],
    dp: LessonTimes[][],
}

/**
 * Represents the start and end times of a single lesson.
 */
interface LessonTimes {
    /**
     * The hour this lesson starts, 0-indexed from 0 to 23
     */
    startHours: number,
    /**
     * The minute this lesson starts, 0-indexed from 0 to 59
     */
    startMinutes: number,
    /**
     * The hour this lesson ends, 0-indexed from 0 to 23
     */
    endHours: number,
    /**
     * The minute this lesson ends, 0-indexed from 0 to 59
     */
    endMinutes: number
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
    const now = fmtDate(new Date());
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
function makeEventIcal(event: Lesson, now: string, counter: number): string {
    let strings: string[] = [];
    strings.push("BEGIN:VEVENT");
    // This should be unique between each event, ideally between calendars too
    strings.push(`UID:${now}_${counter}@rocketrace.github.io`);
    // Event generation time
    strings.push(`DTSTAMP:${now}`);
    // Start and end times
    strings.push(`DTSTART:${fmtDate(event.startTime)}`);
    strings.push(`DTEND:${fmtDate(event.endTime)}`);
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
function makeCalendar(
    grade: "pyp" | "myp" | "dp",
    choices: LessonChoices
): string[] | null {
    const csvFile = loadFile("/src/data/calendar.csv");
    const timesFile = loadFile("/src/data/times.json");
    const rotationFile = loadFile("/src/data/rotation.json");
    // Check whether any requests failed
    if (csvFile === null || timesFile === null || rotationFile === null) {
        alert("Could not load the calendar data! Try again later.");
        return null
    }
    // CSV source, with headers stripped
    // TODO: follow headers
    const source = csvFile.substring(csvFile.indexOf("\n") + 1).split("\n");
    // The start & end times for each lesson per week day
    const times: Week = JSON.parse(timesFile);
    // The lessons per rotation day
    const rotation: Rotation = JSON.parse(rotationFile);
    let rawCalendar: Lesson[] = [];
    // Each cache entry is a list of Lessons
    let cache: LessonCache = {};
    source.forEach(entry => {
        let day = bridgeDay(entry, rotation.days);
        let key = dayKey(day);
        if (cache[key] === undefined) {
            for (let i = 0; i < rotation[grade][day.rotationDay].length; i++) {
                // This assumes that each valid combination of week day and 
                // rotation has the same amount of lessons
                const lesson = rotation[grade][day.rotationDay][i];
                const time = times[grade][day.weekDay][i];
                // Set time
                let startTime = day.date;
                let endTime = day.date;
                startTime.setHours(time.startHours);
                startTime.setMinutes(time.startMinutes);
                endTime.setHours(time.endHours);
                endTime.setMinutes(time.endMinutes);
                // Special lessons override the label
                let label = "";
                if (lesson.special) {
                    label = lesson.label;
                }
                else {
                    label = choices[lesson.id];
                }
                rawCalendar.push(new Lesson(
                    lesson.id,
                    label,
                    startTime,
                    endTime
                ));
            }
        }
        else {
            rawCalendar.concat(cache[key]);
        }
    });
    let calendar = makeIcal(rawCalendar);
    console.log("Generated iCal calendar contents.");
    console.log(calendar);
    return null;
}

/**
 * Triggers a download on the webpage, downloading a text file with the specified
 * name and content.
 * @param content The content of the file to be downloaded.
 * @param name The file name.
 */
function downloadCalendar(content: string, name: string) {
    let x = Array.from("");
}

const choices = {
    "test": "My Lesson Is Called Test",
    "2": "AAAA",
    "3": "AA",
    "4": "A",
    "5": "AWAA",
    "6": "AAAa",
    "7": "a",
}

makeCalendar("dp", choices);