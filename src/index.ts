const Prompt = require("prompt");
const { gotify } = require("gotify");

interface IRuntimeProps {
    nextEventID: number;
    nextEventTimestamp: number;
    onlyShowSpecials: boolean;
    triggeredAlerts: Record<number, boolean>;
}

const RUNTIME_PROPERTIES: IRuntimeProps = {
    nextEventID: -1,
    nextEventTimestamp: 0,
    onlyShowSpecials: false,
    triggeredAlerts: {},
}

const ALERTS = [
    1000 * 60 * 10,
    1000 * 60 * 5,
    1000 * 60 * 2,
    0,
];

const DEFAULT_GOTIFY_SETTINGS = {
    server: "",
    app: "",
    priority: 5,
};

enum EVENTS {
    "Spider Swarm",
    "Unnatural Outcrop",
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
