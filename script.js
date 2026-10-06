const API_URL = "https://pokeapi.co/api/v2/pokemon";
const PAGE_SIZE = 24; // the assignment needs at least 20 per page

const grid = document.querySelector("#grid");
const message = document.querySelector("#message");
const searchInput = document.querySelector("#search");
const prevButton = document.querySelector("#prev");
const nextButton = document.querySelector("#next");
const pageInfo = document.querySelector("#page-info");

let offset = 0;          // where the current page starts in the API list
let loadedPokemon = [];  // the Pokémon of the current page (already fetched)
let hasNext = false;
let hasPrevious = false;
let totalPages = 1;
let requestId = 0;       // stops an old, slow request from overwriting a newer one

const DEFAULT_MESSAGE = "Press “Choose me” on a Pokémon to hear from it.";

/* ---------- 1. FETCH from the API ---------- */

async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Request failed: ${url}`);
    }
    return response.json();
}

// Keep only what we need from the big API answer
function simplify(data) {
    return {
        name: data.name,
        image:
            data.sprites.other["official-artwork"].front_default ||
            data.sprites.front_default,
        abilities: data.abilities.map((item) =>
            item.ability.name.replace("-", " ")
        ),
        types: data.types.map((item) => item.type.name),
        height: data.height / 10, // decimetres -> metres
        weight: data.weight / 10, // hectograms -> kilograms
    };
}

async function loadPage() {
    const thisRequest = ++requestId;

    grid.replaceChildren();
    message.textContent = "Loading Pokémon...";
    prevButton.disabled = true;
    nextButton.disabled = true;

    try {
        // Step 1: the list (names + urls), fetched once per page
        const list = await fetchJson(`${API_URL}?limit=${PAGE_SIZE}&offset=${offset}`);

        // Step 2: the details of every Pokémon in that list, all at the same time
        const details = await Promise.all(
            list.results.map((pokemon) => fetchJson(pokemon.url))
        );

        if (thisRequest !== requestId) return; // a newer request replaced this one

        loadedPokemon = details.map(simplify);
        hasNext = list.next !== null;
        hasPrevious = list.previous !== null;
        totalPages = Math.ceil(list.count / PAGE_SIZE);

        showPokemon();
    } catch (error) {
        if (thisRequest !== requestId) return;
        message.textContent = "Could not load Pokémon. Check your internet and refresh.";
        console.error(error);
    }
}

/* ---------- 2. USE THE DATA (build the DOM) ---------- */

function createCard(pokemon) {
    const card = document.createElement("article");
    card.className = `card type-${pokemon.types[0]}`;

    const hoverTag = document.createElement("div");
    hoverTag.className = "hover-tag";
    hoverTag.textContent = `I'm ${pokemon.name}. Choose me!`;

    const img = document.createElement("img");
    img.src = pokemon.image;
    img.alt = pokemon.name;
    img.loading = "lazy";

    const title = document.createElement("h2");
    title.textContent = pokemon.name;

    const types = document.createElement("div");
    types.className = "types";
    pokemon.types.forEach((typeName) => {
        const badge = document.createElement("span");
        badge.className = `type-badge type-${typeName}`;
        badge.textContent = typeName;
        types.append(badge);
    });

    const stats = document.createElement("p");
    stats.className = "stats";
    stats.textContent = `${pokemon.height} m • ${pokemon.weight} kg`;

    const button = document.createElement("button");
    button.textContent = "Choose me";
    button.addEventListener("click", () => {
        document
            .querySelectorAll(".card.selected")
            .forEach((el) => el.classList.remove("selected"));
        card.classList.add("selected");

        message.textContent = `I am ${pokemon.name} and I have ${pokemon.abilities.join(" and ")}.`;
    });

    card.append(hoverTag, img, title, types, stats, button);
    return card;
}

// Search: filters the data we ALREADY loaded. No API call here.
function showPokemon() {
    const text = searchInput.value.trim().toLowerCase();
    const matches = loadedPokemon.filter((pokemon) =>
        pokemon.name.includes(text)
    );

    grid.replaceChildren(...matches.map(createCard));

    if (matches.length === 0) {
        message.textContent = `No Pokémon on this page match “${searchInput.value.trim()}”. Try the Next page.`;
    } else {
        message.textContent = DEFAULT_MESSAGE;
    }

    pageInfo.textContent = `Page ${offset / PAGE_SIZE + 1} of ${totalPages}`;
    prevButton.disabled = !hasPrevious;
    nextButton.disabled = !hasNext;
}

/* ---------- 3. EVENTS ---------- */

searchInput.addEventListener("input", showPokemon);

nextButton.addEventListener("click", () => {
    offset += PAGE_SIZE;
    loadPage();
    window.scrollTo({ top: 0 });
});

prevButton.addEventListener("click", () => {
    offset -= PAGE_SIZE;
    loadPage();
    window.scrollTo({ top: 0 });
});

/* ---------- START ---------- */

loadPage();