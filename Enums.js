
const Universal = Object.freeze({
    /** @readonly @enum {number} */
    Types: Object.freeze({
        Normal: 0,
        Favorite: 1,
        Foreign: 2,
        Special: 3,
    }),

    /** @readonly @enum {number} */
    Gender: Object.freeze({
        Male: 0,
        Female: 1,
    }),

    /** @readonly @enum {number} */
    FavoriteColors: Object.freeze({
        Red: 0,
        Orange: 1,
        Yellow: 2,
        Lime: 3,
        Green: 4,
        Blue: 5,
        Cyan: 6,
        Pink: 7,
        Purple: 8,
        Brown: 9,
        White: 10,
        Black: 11,
    }),

    /** @readonly @enum {number} */
    SkinColors: Object.freeze({
        White: 0,
        TannedWhite: 1,
        DarkerWhite: 2,
        TannedDarker: 3,
        MostlyBlack: 4,
        Black: 5,
    }),

    /** @readonly @enum {number} */
    HairColors: Object.freeze({
        Black: 0,
        Brown: 1,
        Red: 2,
        ReddishBrown: 3,
        Grey: 4,
        LightBrown: 5,
        DarkBlonde: 6,
        Blonde: 7,
    }),

    /** @readonly @enum {number} */
    EyeColors: Object.freeze({
        Black: 0,
        Grey: 1,
        Brown: 2,
        Lime: 3,
        Blue: 4,
        Green: 5,
    }),
});

/** @type {EnumGroup} */
const Wii = Object.freeze({
    ...Universal,

    /** @readonly @enum {number} */
    FaceFeatures: Object.freeze({
        None: 0,
        Blush: 1,
        MakeupAndBlush: 2,
        Freckles: 3,
        Bags: 4,
        WrinklesOnCheeks: 5,
        WrinklesNearEyes: 6,
        ChinWrinkle: 7,
        Makeup: 8,
        Stubble: 9,
        WrinklesNearMouth: 10,
        Wrinkles: 11,
    }),

    /** @readonly @enum {number} */
    MouthColors: Object.freeze({
        Peach: 0,
        Red: 1,
        Pink: 2,
    }),

    /** @readonly @enum {number} */
    GlassesColors: Object.freeze({
        Grey: 0,
        Brown: 1,
        Red: 2,
        Blue: 3,
        Yellow: 4,
        White: 5,
    }),
});

const ThreeDS = Object.freeze({
    ...Universal,

    /** @readonly @enum {number} */
    FaceFeatures: Object.freeze({
        None: 0,
        NearEyeCreases: 1,
        CheekCreases: 2,
        FarEyeCreases: 3,
        NearNoseCreases: 4,
        GiantBags: 5,
        CleftChin: 6,
        ChinCrease: 7,
        SunkenEyes: 8,
        FarCheekCreases: 9,
        LinesNearEyes: 10,
        Wrinkles: 11,
    }),

    /** @readonly @enum {number} */
    Makeups: Object.freeze({
        None: 0,
        Blush: 1,
        OrangeBlush: 2,
        BlueEyes: 3,
        Blush2: 4,
        OrangeBlush2: 5,
        BlueEyesAndBlush: 6,
        OrangeEyesAndBlush: 7,
        PurpleEyesAndBlush2: 8,
        Freckles: 9,
        BeardStubble: 10,
        BeardAndMustacheStubble: 11,
    }),

    /** @readonly @enum {number} */
    MouthColors: Object.freeze({
        Orange: 0,
        Red: 1,
        Pink: 2,
        Peach: 3,
        Black: 4,
    }),

    /** @readonly @enum {number} */
    GlassesColors: Object.freeze({
        Black: 0,
        Brown: 1,
        Red: 2,
        Blue: 3,
        Yellow: 4,
        Grey: 5,
    }),
});

const Enums = Object.freeze({
    Wii,
    ThreeDS,
});

module.exports = Enums;