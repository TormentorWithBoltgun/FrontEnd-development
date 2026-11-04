const app = Vue.createApp({

    data() {

        return {

            aktiivinenNakyma: "dashboard",

            valittuPlaneetta: "Cadia",

            // Tactical view
            taktinenPlaneetta: null,
            raporttiAuki: false,

            // Break tab
            aanetPaalla: false,

            planeetat: [

                {
                    nimi: "Cadia",
                    tyyppi: "Fortress World",
                    sektori: "Eye of Terror",
                    vaesto: 1200000000,
                    uhka: 82,
                    joukot: 8421,
                    viholliset: 14283,
                    resurssit: ["Adamantium", "Plasma", "Void Shields"],
                    viimeinenViesti: "[11:52] Pylon network failing. Requesting immediate reinforcement.",
                    status: "CRITICAL"
                },

                {
                    nimi: "Terra",
                    tyyppi: "Throneworld",
                    sektori: "Sol",
                    vaesto: 40000000000,
                    uhka: 15,
                    joukot: 50000,
                    viholliset: 3200,
                    resurssit: ["Psykers", "Relics", "Manufactorum Output"],
                    viimeinenViesti: "[11:49] The Emperor protects. Palace defences nominal.",
                    status: "SECURE"
                },

                {
                    nimi: "Armageddon",
                    tyyppi: "Hive World",
                    sektori: "Armageddon",
                    vaesto: 8500000000,
                    uhka: 67,
                    joukot: 12500,
                    viholliset: 18300,
                    resurssit: ["Promethium", "Ore", "Hive Labour"],
                    viimeinenViesti: "[11:47] Ork landing detected in the southern hives.",
                    status: "WARNING"
                },

                {
                    nimi: "Mars",
                    tyyppi: "Forge World",
                    sektori: "Sol",
                    vaesto: 35000000000,
                    uhka: 8,
                    joukot: 9000,
                    viholliset: 120,
                    resurssit: ["Archeotech", "Titan Components", "Machine Spirits"],
                    viimeinenViesti: "[11:40] Omnissiah's blessing received. Production at 112%.",
                    status: "SECURE"
                },

                {
                    nimi: "Macragge",
                    tyyppi: "Capital World",
                    sektori: "Ultima Segmentum",
                    vaesto: 5400000000,
                    uhka: 34,
                    joukot: 6400,
                    viholliset: 5200,
                    resurssit: ["Agri-Output", "Recruits", "Ultramar Tithes"],
                    viimeinenViesti: "[11:38] Tyranid spore sighted at the system edge.",
                    status: "SECURE"
                },

                {
                    nimi: "Fenris",
                    tyyppi: "Death World",
                    sektori: "Segmentum Solar",
                    vaesto: 4000000,
                    uhka: 51,
                    joukot: 2100,
                    viholliset: 3900,
                    resurssit: ["Ice Ore", "Wolf Pelts", "Recruits"],
                    viimeinenViesti: "[11:35] Sky Warriors scouting the glacial plains.",
                    status: "WARNING"
                },

                {
                    nimi: "Baal",
                    tyyppi: "Chapter Homeworld",
                    sektori: "Segmentum Solar",
                    vaesto: 3000000,
                    uhka: 74,
                    joukot: 1800,
                    viholliset: 9800,
                    resurssit: ["Red Sand", "Gene-seed", "Relics"],
                    viimeinenViesti: "[11:31] Hive Fleet tendrils in orbit. Chapter mobilising.",
                    status: "CRITICAL"
                }

            ],


            yksikot: [

                {
                    nimi: "Adeptus Astartes",
                    tyyppi: "Space Marines",
                    maara: 1200
                },

                {
                    nimi: "Astra Militarum",
                    tyyppi: "Imperial Guard",
                    maara: 8500
                },

                {
                    nimi: "Imperial Knights",
                    tyyppi: "Heavy Walker",
                    maara: 42
                },

                {
                    nimi: "Adeptus Mechanicus",
                    tyyppi: "Tech-Priests",
                    maara: 730
                },

                {
                    nimi: "Imperial Navy",
                    tyyppi: "Fleet",
                    maara: 85
                },

                {
                    nimi: "Sisters of Battle",
                    tyyppi: "Adepta Sororitas",
                    maara: 2400
                }

            ],


            tapahtumat: [

                {
                    id: 1,
                    aika: "11:42",
                    viesti: "Enemy contact detected."
                },

                {
                    id: 2,
                    aika: "11:43",
                    viesti: "Astartes squad deployed."
                },

                {
                    id: 3,
                    aika: "11:45",
                    viesti: "Orbital bombardment authorized."
                },

                {
                    id: 4,
                    aika: "11:52",
                    viesti: "Sector remains under Imperial control."
                }

            ]

        };
    },


    computed: {

        nykyinenPlaneetta() {

            return this.planeetat.find(
                planeetta =>
                    planeetta.nimi === this.valittuPlaneetta
            );

        },

        // Planet shown in the tactical view
        taktinen() {

            return this.planeetat.find(
                planeetta =>
                    planeetta.nimi === this.taktinenPlaneetta
            ) || null;

        },

        voimasuhde() {

            const p = this.taktinen;

            if (!p) return "";

            return p.viholliset
                ? (p.joukot / p.viholliset).toFixed(2) + " : 1"
                : "NO HOSTILES";

        },

        arvio() {

            const p = this.taktinen;

            if (!p) return "";

            if (p.status === "CRITICAL") {
                return "Planetary defences are failing. Immediate reinforcement and orbital support recommended.";
            }

            if (p.status === "WARNING") {
                return "Situation contained but unstable. Maintain readiness and monitor enemy movements.";
            }

            return "Planet secure. Tithes and resources are flowing to the Imperium as ordained.";

        }

    },


    watch: {

        aktiivinenNakyma(nakyma) {

            if (nakyma === "map") {
                this.$nextTick(() => this.alustaKartta());
            } else {
                window.GalacticMap?.destroy();
                this.taktinenPlaneetta = null;
                this.raporttiAuki = false;
            }

            if (nakyma === "lofi") {
                this.$nextTick(() => window.LofiScene?.init(document.getElementById("lofi-scene")));
            } else {
                window.LofiScene?.destroy();
                this.aanetPaalla = false;
            }

        },

        valittuPlaneetta(nimi) {

            window.GalacticMap?.select(nimi);

        },

        // Keep map colours in sync when stats change
        planeetat: {
            deep: true,
            handler(planeetat) {
                window.GalacticMap?.update(planeetat);
            }
        }

    },


    methods: {

        vaihdaNakyma(nakyma) {

            this.aktiivinenNakyma = nakyma;

        },


        valitsePlaneetta(nimi) {

            this.valittuPlaneetta = nimi;

            this.aktiivinenNakyma = "dashboard";

        },


        kellonaika() {

            const nyt = new Date();

            return String(nyt.getHours()).padStart(2, "0") +
                ":" +
                String(nyt.getMinutes()).padStart(2, "0");

        },


        muotoile(luku) {

            return Number(luku).toLocaleString("en-US");

        },


        lisaaTapahtuma(viesti) {

            this.tapahtumat.unshift({

                id: Date.now(),

                aika: this.kellonaika(),

                viesti: viesti

            });

        },


        // Writes to the command log and the planet's "last transmission"
        lahetys(planeetta, viesti) {

            planeetta.viimeinenViesti = "[" + this.kellonaika() + "] " + viesti;

            this.lisaaTapahtuma(viesti);

        },


        paivitaStatus(planeetta) {

            if (planeetta.uhka >= 70) {
                planeetta.status = "CRITICAL";
            } else if (planeetta.uhka >= 40) {
                planeetta.status = "WARNING";
            } else {
                planeetta.status = "SECURE";
            }

        },


        deployForces(planeetta) {

            const lisays = 300 + Math.floor(Math.random() * 500);

            planeetta.joukot += lisays;

            planeetta.viholliset = Math.max(
                0,
                planeetta.viholliset - Math.floor(planeetta.viholliset * 0.03)
            );

            planeetta.uhka = Math.max(0, planeetta.uhka - 3);

            this.paivitaStatus(planeetta);

            this.lahetys(
                planeetta,
                this.muotoile(lisays) + " Imperial troops deployed to " + planeetta.nimi + "."
            );

        },


        orbitalStrikeOn(planeetta) {

            const tapot = Math.floor(
                planeetta.viholliset * (0.15 + Math.random() * 0.15)
            );

            planeetta.viholliset -= tapot;

            planeetta.uhka = Math.max(0, planeetta.uhka - 8);

            // Collateral damage is acceptable
            planeetta.vaesto -= Math.floor(planeetta.vaesto * 0.005);

            this.paivitaStatus(planeetta);

            window.GalacticMap?.strike(planeetta.nimi);

            this.lahetys(
                planeetta,
                "Orbital strike on " + planeetta.nimi + ": " +
                this.muotoile(tapot) + " hostiles eliminated."
            );

        },


        // Dashboard buttons use the same logic
        lahetaJoukot() {

            this.deployForces(this.nykyinenPlaneetta);

        },


        orbitalStrike() {

            this.orbitalStrikeOn(this.nykyinenPlaneetta);

        },


        scanSector() {

            this.lisaaTapahtuma(
                "Sector scan completed. No additional threats detected."
            );

        },


        suljeTaktinen() {

            this.taktinenPlaneetta = null;
            this.raporttiAuki = false;

        },


        vaihdaAani() {

            this.aanetPaalla = !this.aanetPaalla;

            window.LofiScene?.setSound(this.aanetPaalla);

        },


        alustaKartta() {

            if (!window.GalacticMap) return;

            GalacticMap.init(document.getElementById("star-map"), {

                planets: this.planeetat,

                selected: this.valittuPlaneetta,

                onSelect: (nimi) => {

                    this.valittuPlaneetta = nimi;
                    this.taktinenPlaneetta = nimi;
                    this.raporttiAuki = false;

                }
            });

        }

    }

});


// <div v-planet-art="planetName"> draws the animated planet picture
app.directive("planet-art", {
    mounted(el, binding) {
        window.PlanetArt?.render(el, binding.value);
    },
    updated(el, binding) {
        if (binding.value !== binding.oldValue) window.PlanetArt?.render(el, binding.value);
    },
    unmounted(el) {
        window.PlanetArt?.clear(el);
    }
});


app.mount("#app");