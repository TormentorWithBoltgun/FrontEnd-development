
/* kello / clock */
function paivitaKello() {

    const nyt = new Date();

    const tunti = String(nyt.getHours()).padStart(2, "0");
    const minuutti = String(nyt.getMinutes()).padStart(2, "0");
    const sekunti = String(nyt.getSeconds()).padStart(2, "0");

    const aika =
        tunti + ":" +
        minuutti + ":" +
        sekunti;

    document.getElementById("kello").textContent = aika;
}


paivitaKello();

setInterval(paivitaKello, 1000);



document.addEventListener("DOMContentLoaded", () => {

    luoVoxTicker();
    luoMuistio();
    alustaPikanappaimet();

});


/*  VOX TICKER: typewriter transmissions at the bottom   */

const VOX_VIESTIT = [
    "Astropath choir reports warp storms near the Cadian Gate.",
    "Adeptus Mechanicus requests more incense for the Mars forges.",
    "Navigator guild delays: the Astronomican is faint tonight.",
    "Inquisitor Vale authorizes Exterminatus on hive Delta-9.",
    "Ecclesiarchy: remember to attend evening prayers.",
    "Servo-skull patrol 7 reports no heresy in sector 12.",
    "Munitorum: ration packs delayed. Faith will sustain you.",
    "The Emperor protects. Report all mutants to your commissar."
];

function luoVoxTicker() {

    const palkki = document.createElement("div");
    palkki.className = "vox-bar";
    palkki.innerHTML =
        '<span class="vox-label">VOX</span>' +
        '<span class="vox-text"></span>';

    document.body.appendChild(palkki);

    const teksti = palkki.querySelector(".vox-text");

    let indeksi = 0;
    let tauolla = false;

    // Pause while the mouse is over the bar
    palkki.addEventListener("mouseenter", () => { tauolla = true; });
    palkki.addEventListener("mouseleave", () => { tauolla = false; });

    function seuraavaViesti() {

        const viesti = VOX_VIESTIT[indeksi];
        let merkki = 0;

        function kirjoita() {

            if (tauolla) {
                setTimeout(kirjoita, 200);
                return;
            }

            merkki++;
            teksti.textContent = viesti.slice(0, merkki);

            if (merkki < viesti.length) {
                setTimeout(kirjoita, 35);
            } else {
                indeksi = (indeksi + 1) % VOX_VIESTIT.length;
                setTimeout(seuraavaViesti, 3500);
            }
        }

        kirjoita();
    }

    seuraavaViesti();
}


/* =========================================================
   COMMAND NOTES: saved to localStorage
   ========================================================= */

function luoMuistio() {

    const AVAIN = "imperial-command-muistio";

    const nappi = document.createElement("button");
    nappi.className = "notes-toggle";
    nappi.textContent = "NOTES";

    const paneeli = document.createElement("div");
    paneeli.className = "notes-panel";
    paneeli.hidden = true;
    paneeli.innerHTML =
        "<h3>COMMAND NOTES</h3>" +
        '<textarea placeholder="Write your orders here..."></textarea>' +
        '<div class="notes-footer">' +
        '<span class="notes-count"></span>' +
        '<button class="notes-clear">CLEAR</button>' +
        "</div>";

    document.body.append(nappi, paneeli);

    const alue = paneeli.querySelector("textarea");
    const laskuri = paneeli.querySelector(".notes-count");
    const tyhjenna = paneeli.querySelector(".notes-clear");

    // localStorage can be blocked by the browser, so wrap it
    function lue() {
        try { return localStorage.getItem(AVAIN) || ""; }
        catch (e) { return ""; }
    }

    function tallenna(teksti) {
        try { localStorage.setItem(AVAIN, teksti); }
        catch (e) { /* ignore */ }
    }

    function paivitaLaskuri(tila) {
        laskuri.textContent = alue.value.length + " CHARS // " + tila;
    }

    alue.value = lue();
    paivitaLaskuri("SAVED");

    // Save 400 ms after the user stops typing
    let ajastin;

    alue.addEventListener("input", () => {

        paivitaLaskuri("SAVING...");

        clearTimeout(ajastin);

        ajastin = setTimeout(() => {
            tallenna(alue.value);
            paivitaLaskuri("SAVED");
        }, 400);
    });

    tyhjenna.addEventListener("click", () => {

        if (confirm("Purge all notes?")) {
            alue.value = "";
            tallenna("");
            paivitaLaskuri("SAVED");
        }
    });

    nappi.addEventListener("click", () => {

        paneeli.hidden = !paneeli.hidden;

        if (!paneeli.hidden) {
            alue.focus();
        }
    });
}


    /*
    KEYBOARD SHORTCUTS
      1-6  = sidebar views (in sidebar order)
      N    = toggle notes
      Esc  = close notes / planetary report / tactical panel
    */

function alustaPikanappaimet() {

    document.addEventListener("keydown", (e) => {

        // Esc always works
        if (e.key === "Escape") {

            const muistio = document.querySelector(".notes-panel");
            const raportti = document.querySelector(".modal-backdrop");
            const taktinen = document.querySelector(".tactical-close");

            if (muistio && !muistio.hidden) {
                muistio.hidden = true;
            } else if (raportti) {
                raportti.click();
            } else if (taktinen) {
                taktinen.click();
            }

            return;
        }

        // Do not react while typing
        const kohde = e.target.tagName;

        if (kohde === "TEXTAREA" || kohde === "INPUT" || kohde === "SELECT") return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;

        if (e.key >= "1" && e.key <= "9") {

            const napit = document.querySelectorAll(".sidebar button");
            const nappi = napit[Number(e.key) - 1];

            if (nappi) nappi.click();
        }

        if (e.key.toLowerCase() === "n") {

            const nappi = document.querySelector(".notes-toggle");

            if (nappi) nappi.click();
        }
    });
}