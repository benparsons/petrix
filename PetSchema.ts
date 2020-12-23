

class Attribute {
    initValue: number;
    tickDelta: number;
    max: object;
    min: object;

    constructor(initValue: number, tickDelta: number, max: object, min: object) {
        this.initValue = initValue;
        this.tickDelta = tickDelta;
        this.max = max;
        this.min = min;
    }
}

export class PetSchema {
    static attributes: object = {
        age: new Attribute(0, 1, { limit: 80, warn: 60 }, { limit: 0, warn: 0 }),
        energy: new Attribute(20, -2, { limit: 110, warn: 90 }, { limit: 0, warn: 20 }),
        happiness: new Attribute(50, -1, { limit: 1000, warn: 900 }, { limit: 0, warn: 30 }),
    };
    static actions: object = {
        feed: [
            {
                attribute: "energy",
                baseDelta: 20,
                deltaDelta: -5
            }
        ],
        play: [
            {
                attribute: "happiness",
                baseDelta: 5,
                deltaDelta: -1
            },
            {
                attribute: "energy",
                baseDelta: -2,
                deltaDelta: -2
            }
        ]
    };
}