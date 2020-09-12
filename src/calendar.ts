let selectedGrade: null | GradeGroup = null;
let generatedCalendar: null | string = null;
/**
 * Reads a file from the web page, and returns its response content. 
 * If not found, returns `null`.
 *
 * Reads are done synchronously. The file path is relative to the current path.
 * 
 * TODO: Asynchronous requests? To be fair, this is only called three times in the whole script, 
 * and each request is to the site itself, for assets.
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
 * Clones a date. Strips time information.
 * @param date The date to copy.
 */
function copyDate(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Formats a date into a iCal-friendly string.
 * @param date The date to be formatted.
 */
function fmtDate(date: Date): string {
    // y10k bug incoming
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
    return `${year}${mo}${dd}T${hh}${mm}${ss}`;
}

/**
 * Represents a grade level group. Different groups have slight variations in schedules.
 */
type GradeGroup = "myp" | "dp" | "other";

/**
 * Represents a single calendar day.
 */
interface CalendarDay {
    /**
     * Rotation day, from 0 (Day 1A) to 8 (Day 9A) to 9 (Day 1B) to 17 (Day 9B)
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
 * @param days A list of strings to search the entry from.
 * @param firstHalf A boolean that, when true, only considers the *first* 9 days are being considered
 */
function bridgeDay(entry: string, days: string[], firstHalf: boolean): CalendarDay {
    // CSV headers are defined as:
    // Name, Date, Start, End, Notes, Details, Type
    const split = entry.split(",");
    // This is offset by 9 every other week.
    // Strictly speaking, only the 8th (zero-indexed) and 17th entries are different.
    // Therefore, `firstHalt`
    const rotationDay = days.indexOf(split[0].substring(1, split[0].length - 1)) + (firstHalf ? 0 : 9);
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
    myp: RotationLesson[][],
    dp: RotationLesson[][],
    other: RotationLesson[][],
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
    time: LessonTimes | undefined
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
    myp: LessonTimes[][],
    dp: LessonTimes[][],
    other: LessonTimes[][],
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
    // Establish the timezone, since these times are specified as local
    strings.push("BEGIN:VTIMEZONE");
    strings.push("TZID:Asia/Tokyo");
    strings.push("BEGIN:STANDARD");
    strings.push("DTSTART:20200815T000000");
    strings.push("TZOFFSETO:+0900");
    strings.push("TZOFFSETFROM:+0900");
    strings.push("END:STANDARD");
    strings.push("END:VTIMEZONE");

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
 * Generates a calendar for the given grade level, using the given class decisions.
 */
function makeCalendar(
    grade: GradeGroup,
    choices: LessonChoices
): string | null{
    const csvFile = loadFile("/src/data/calendar.csv");
    const timesFile = loadFile("/src/data/times.json");
    const rotationFile = loadFile("/src/data/rotation.json");
    // Check whether any requests failed
    if (csvFile === null || timesFile === null || rotationFile === null) {
        console.error("Failed to make request");
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
    let firstHalf = true;
    source.forEach(entry => {
        let day = bridgeDay(entry, rotation.days, firstHalf);
        // On day 9, check the toggle 
        if (day.rotationDay in [8, 17]) {
            // Toggle the boolean
            firstHalf = !firstHalf;
        }
        let key = dayKey(day);
        if (cache[key] === undefined) {
            for (let i = 0; i < rotation[grade][day.rotationDay].length; i++) {
                // This assumes that each valid combination of week day and 
                // rotation has the same amount of lessons
                const lesson = rotation[grade][day.rotationDay][i];
                // If the lesson defines a special time, use that instead of the weekday time
                const time = lesson.time === undefined ? times[grade][day.weekDay][i] : lesson.time;
                // Clone the time, to avoid multible mutability
                let startTime = copyDate(day.date);
                let endTime = copyDate(day.date);
                startTime.setHours(time.startHours, time.startMinutes, 0, 0);
                endTime.setHours(time.endHours, time.endMinutes, 0, 0);
                // Special lessons override the label
                let label = lesson.special ? lesson.label : choices[lesson.id]
                // An empty label represents an empty choice
                if (label === "") {
                    continue
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
    return calendar;
}
/**
 * Downloads an ICS file with a given name and text content.
 * @param filename The filename to download the file with
 * @param text The content of the text file
 */
function download(filename: string, text: string) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/ics;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();
    document.body.removeChild(element);
}

/**
 * Generates the input forms for each lesson, based on the contents of `data/keys.json`.
 * @param grade The selected grade level.
 */
function generateLessons(grade: GradeGroup) {
    let prev = <HTMLDivElement>document.getElementById("gradeState");
    prev.hidden = true;
    let current = <HTMLDivElement>document.getElementById("lessonsState");
    current.hidden = false;
    let keysText = loadFile("/src/data/keys.json")
    if (keysText === null) {
        console.error("Failed to make request");
        alert("Could not load the calendar data! Try again later.");
        return;
    }
    let keys: LessonChoices = JSON.parse(keysText);
    let inputs = <HTMLDivElement>document.getElementById("lessonInputs");
    for (const key in keys) {
        if (Object.prototype.hasOwnProperty.call(keys, key)) {
            const label = keys[key];

            let field = document.createElement("input");
            field.id = `lesson_${key}`;
            field.type = "text";
            field.placeholder = label;
            field.size = 20;
            // Google and Apple seem to place no real limit on event labels.
            // This should reduce the final file size, though.
            field.maxLength = 1000;
            inputs.appendChild(field);
            inputs.appendChild(document.createElement("br"));
        }
    }
}

/**
 * Makes the final download link visible.
 */
function generateDownload() {
    let prev = <HTMLDivElement>document.getElementById("lessonsState");
    prev.hidden = true;
    let current = <HTMLDivElement>document.getElementById("downloadState");
    current.hidden = false;
}

/**
 * Shows or hides the "Grade level is required" error message.
 */
function showGradeError(hidden: boolean) {
    const div = <HTMLDivElement>document.getElementById("gradeRequiredError");
    div.hidden = hidden;
}

// === These functions are for buttons! ===
/**
 * Submits and stores the grade level of the user.
 */
function submitGrade() {
    const input = <HTMLSelectElement>document.getElementById("gradeInput");
    const grade = input.value;
    if (grade === "") {
        showGradeError(false);
    }
    else {
        showGradeError(true);
        selectedGrade = <GradeGroup>grade; // global
        generateLessons(selectedGrade);
    }
}
/**
 * Reads the user's lesson choices from the input fields.
 * 
 * Generates a calendar string using the given choices, and assigns the resulting 
 * string to `generatedCalendar`.
 */
function submitLessons() {
    let inputs = <HTMLDivElement>document.getElementById("lessonInputs");
    const children = inputs.children;
    let choices: LessonChoices = {};
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName === "INPUT") {
            const input = <HTMLInputElement>child;
            choices[input.id.substring(7)] = input.value ? input.value : "";
        }
    }
    if (selectedGrade === null) {
        console.error("Somehow the selected grade is not valid?");
        alert("Something went wrong! Refresh and try again.")
        return;
    }
    generatedCalendar = makeCalendar(selectedGrade, choices);
    if (generatedCalendar === null) {
        console.error("Calendar could not be generated.");
        alert("Could not generate a calendar. Please refresh and try again!");
        return;
    }
    generateDownload();
}

/**
 * Trigger a download to the globally stored `generatedCalendar` object, as an ICS file.
 * You should only call this after assigning to `generatedCalendar`.
 */
function downloadCalendar() {
    if (generatedCalendar === null) {
        console.error("A calendar was not properly generated");
        return
    }
    download("calendar.ics", generatedCalendar);
}

window.onload = init;

function init() {
    document.getElementById("gradeSubmit")!.onclick = submitGrade;
    document.getElementById("lessonsSubmit")!.onclick = submitLessons;
    document.getElementById("downloadCalendar")!.onclick = downloadCalendar;
}
    