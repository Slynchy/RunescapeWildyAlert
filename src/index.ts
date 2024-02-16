const Prompt = require("prompt");
const { gotify } = require("gotify");

/**
 * Const convenience object to hold runtime variables
 */
const RUNTIME_PROPERTIES = {
    nextEventID: -1,
    nextEventTimestamp: 0,
    onlyShowSpecials: false,
    triggeredAlerts: {},
}

/**
 * The alert times in milliseconds
 */
const ALERTS = [
    1000 * 60 * 10, // 10 mins
    1000 * 60 * 5,  // 5 mins
    1000 * 60 * 2,  // 2 mins
    0,              // Happening!
];

/**
 * The default gotify settings
 */
const DEFAULT_GOTIFY_SETTINGS = {
    server: "",
    app: "",
    priority: 5,
};

enum EVENTS {
    "Spider Swarm",
    "Unnatural Outcrop",
    "Stryke the Wyrm",
    "Demon Stragglers",
    "Butterfly Swarm",
    "King Black Dragon Rampage (Special)",
    "Forgotten Soldiers",
    "Surprising Seedlings",
    "Hellhound Pack",
    "Infernal Star (Special)",
    "Lost Souls",
    "Ramokee Incursion",
    "Displaced Energy",
    "Evil Bloodwood Tree (Special)",
    NUM_OF_EVENTS
}

const SPECIAL_EVENTS = [
    EVENTS["Stryke the Wyrm"],
    EVENTS["Infernal Star (Special)"],
    EVENTS["Evil Bloodwood Tree (Special)"],
    EVENTS["King Black Dragon Rampage (Special)"],
];

function promptForInput(
    string?: string,
): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        // Prompt.start();
        Prompt.get({
            properties: {
                value: {
                    pattern: /^[0-9yn\s\-]+$/,
                    required: true,
                    message: string || ""
                }
            }
        }, (err: Error | null, res: any) => {
            if(err) reject(err);
            else resolve(res["value"]);
        });
    });
}

function calculateNextEvent(now?: number): EVENTS {
    if(!now) now = Date.now();
    return now - (now % (1000 * 60 * 60)) + (1000 * 60 * 60);
}

function logEvent(selectedEvent: EVENTS, timestamp: number) {
    console.log("Next event is %s at %s", EVENTS[selectedEvent], new Date(
        timestamp
    ).toISOString());
}

async function main() {
    const args = process.argv.slice(2);
    if(args.length < 2 && (!DEFAULT_GOTIFY_SETTINGS.app || !DEFAULT_GOTIFY_SETTINGS.server)) {
        console.error("Please provide both the Gotify server and app tokens as arguments!");
        return;
    } else {
        DEFAULT_GOTIFY_SETTINGS.server = args[0];
        DEFAULT_GOTIFY_SETTINGS.app = args[1];
    }

    for(let i = 0; i < EVENTS.NUM_OF_EVENTS; i++) {
        console.log(`${i+1} - ${EVENTS[i]}`);
    }

    console.log("Please select the next Flash Event:");
    RUNTIME_PROPERTIES.nextEventID = parseInt(await promptForInput()) - 1;
    if(
        isNaN(RUNTIME_PROPERTIES.nextEventID) ||
        RUNTIME_PROPERTIES.nextEventID <= 0 ||
        RUNTIME_PROPERTIES.nextEventID >= EVENTS.NUM_OF_EVENTS
    ) {
        console.error("Invalid selection!");
        return;
    }

    const now = Date.now();
    RUNTIME_PROPERTIES.nextEventTimestamp = now - (now % (1000 * 60 * 60)) + (1000 * 60 * 60);
    logEvent(RUNTIME_PROPERTIES.nextEventID, RUNTIME_PROPERTIES.nextEventTimestamp);

    console.log("Do you want to only know about special events? Y/N");
    RUNTIME_PROPERTIES.onlyShowSpecials = ((await promptForInput()).toLowerCase() === "y");
    if(RUNTIME_PROPERTIES.onlyShowSpecials) {
        console.log("Will alert only for special events.")
    } else {
        console.log("Will alert for all events.")
    }


    console.log("Server started, press CTRL+C to exit...");

    await (new Promise<void>(() => {
        setInterval(
            () => {
                ALERTS.forEach((e, i) => {
                    if(
                        !RUNTIME_PROPERTIES.triggeredAlerts[e] &&
                        Date.now() > (RUNTIME_PROPERTIES.nextEventTimestamp - e)
                    ) {
                        if(
                            !RUNTIME_PROPERTIES.onlyShowSpecials ||
                            (
                                RUNTIME_PROPERTIES.onlyShowSpecials &&
                                SPECIAL_EVENTS.findIndex(
                                    (e) => e === RUNTIME_PROPERTIES.nextEventID
                                ) !== -1
                            )
                        ) {
                            // log
                            console.log(
                                "Triggering alert %i for %s",
                                i,
                                EVENTS[RUNTIME_PROPERTIES.nextEventID]
                            );
                            gotify(Object.assign({
                                title: `${EVENTS[RUNTIME_PROPERTIES.nextEventID]} alert!`,
                                message: `Starts in ${e / 1000 / 60}mins!`,
                            }, DEFAULT_GOTIFY_SETTINGS));
                        }
                        RUNTIME_PROPERTIES.triggeredAlerts[e] = true;
                    }
                });

                if(
                    Date.now() > RUNTIME_PROPERTIES.nextEventTimestamp
                ) {
                    console.log("Event %s is happening now!", EVENTS[RUNTIME_PROPERTIES.nextEventID]);
                    if(++RUNTIME_PROPERTIES.nextEventID >= EVENTS.NUM_OF_EVENTS) {
                        RUNTIME_PROPERTIES.nextEventID = 0;
                    }
                    RUNTIME_PROPERTIES.nextEventTimestamp = calculateNextEvent(Date.now());
                    RUNTIME_PROPERTIES.triggeredAlerts = {};
                }
            },
            1000
        );
    }));
}

main()
    .then(() => {
        process.exit(0);
    });
