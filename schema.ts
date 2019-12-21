export default {
    attributes:
    {
        age: {
            initValue: 0,
            tickDelta: 1,
            max: {
                limit: 80,
                warn: 60
            },
            min: {
                limit: 0,
                warn: 0
            }
        },
        energy: {
            initValue: 20,
            tickDelta: -2,
            max: {
                limit: 110,
                warn: 90
            },
            min: {
                limit: 0,
                warn: 20
            }
        },
        happiness: {
            initValue: 50,
            tickDelta: -1,
            max: {
                limit: 1000,
                warn: 900
            },
            min: {
                limit: 0,
                warn: 30
            }
        }
    },
    actions:
    {
        feed: [
            {
                attribute: "energy",
                delta: 20
            }
        ],
        play: [
            {
                attribute: "happiness",
                delta: 5
            }
        ]
    }
}