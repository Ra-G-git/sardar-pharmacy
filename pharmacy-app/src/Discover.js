import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";
import { fetchCatalog, getRecents } from "./catalogApi";
import { MedicineCard } from "./MedicineCard";
import { getMedicineEmoji } from "./medicineUtils";
import { CATEGORY_IMAGES } from "./categoryImages";

// Tile colours — cycled by position so neighbours always differ.
const TILE_TONES = [
  ["#1F5A33", "#3E8B55"], // forest
  ["#B8741A", "#E8A33D"], // amber
  ["#0F5C63", "#2A9199"], // teal
  ["#4B3F8F", "#7A6BC4"], // indigo
  ["#A4413A", "#D8706A"], // coral
  ["#2F6B3A", "#8DB85C"], // moss
];

function photoFor(name) {
  const key = (name || "").toLowerCase();
  const hit = Object.keys(CATEGORY_IMAGES).find((k) => key.includes(k));
  return hit ? CATEGORY_IMAGES[hit] : "";
}

function CategoryTiles({ categories, onPick }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? categories : categories.slice(0, 8);
  return (
    <section style={styles.section} aria-label="Shop by category">
      <div style={styles.rowHead}>
        <div>
          <h3 style={styles.rowTitle}>Shop by category</h3>
          <p style={styles.rowNote}>Pick a type to browse</p>
        </div>
        {categories.length > 8 && (
          <button className="link-btn" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${categories.length}`}
          </button>
        )}
      </div>
      <div className="cat-tiles">
        {shown.map((c, i) => {
          const [from, to] = TILE_TONES[i % TILE_TONES.length];
          const photo = photoFor(c.name);
          return (
            <button
              key={c.name}
              className="cat-tile"
              style={{ "--from": from, "--to": to }}
              onClick={() => onPick(c.name)}
            >
              {photo && <img className="cat-tile-photo" src={photo} alt="" loading="lazy" />}
              <span className="cat-tile-shade" aria-hidden="true" />
              <span className="cat-tile-blob" aria-hidden="true" />
              <span className="cat-tile-emoji" aria-hidden="true">{getMedicineEmoji(c.name)}</span>
              <span className="cat-tile-text">
                <span className="cat-tile-name">{c.name}</span>
                <span className="cat-tile-count">{c.count.toLocaleString()} listed</span>
              </span>
              <span className="cat-tile-go" aria-hidden="true">→</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// The storefront's landing view: category tabs, a "Suggested for you" row
// (once the visitor has looked at or added something), and a row per big
// category. Picking a tab shows a random selection from that category.
// Nothing here claims stock, speed or popularity — rows are random samples.

function Row({ title, note, items, onSeeAll, cardProps }) {
  const scroller = useRef(null);

  function scroll(dir) {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  }

  return (
    <section style={styles.section}>
      <div style={styles.rowHead}>
        <div>
          <h3 style={styles.rowTitle}>{title}</h3>
          {note && <p style={styles.rowNote}>{note}</p>}
        </div>
        <div style={styles.rowActions}>
          {onSeeAll && (
            <button className="link-btn" onClick={onSeeAll}>See all</button>
          )}
          <button className="arrow-btn" aria-label="Scroll left" onClick={() => scroll(-1)}>‹</button>
          <button className="arrow-btn" aria-label="Scroll right" onClick={() => scroll(1)}>›</button>
        </div>
      </div>
      <div className="row-scroller" ref={scroller}>
        {items.map((med) => (
          <div className="row-item" key={med.slug}>
            <MedicineCard
              med={med}
              addToCart={cardProps.addToCart}
              cartItem={cardProps.getCartItem(med)}
              onCardClick={cardProps.onCardClick}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="medicine-grid" style={styles.wrap} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

function Discover({ decorate, onCardClick, addToCart, getCartItem }) {
  const [home, setHome] = useState(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [suggested, setSuggested] = useState([]);
  const [active, setActive] = useState(null);
  const [browse, setBrowse] = useState({ loading: false, results: [], count: 0, failed: false });
  const [shuffleKey, setShuffleKey] = useState(0);
  const browseReq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    (async () => {
      try {
        const data = await fetchCatalog("home");
        if (!cancelled) setHome(data);
      } catch (err) {
        console.error("Failed to load categories:", err);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // Personalised from what this browser last opened/added. Fetched when the
  // "All" view appears (first load, or coming back from a category), not
  // while someone is browsing it, so rows never shift under their cursor.
  useEffect(() => {
    if (active) return undefined;
    const seeds = getRecents().slice(0, 5);
    if (seeds.length === 0) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCatalog("suggest", { seeds: JSON.stringify(seeds) });
        if (!cancelled) setSuggested(data.results || []);
      } catch (err) {
        console.error("Failed to load suggestions:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const myId = ++browseReq.current;
    setBrowse((b) => ({ ...b, loading: true, failed: false }));
    (async () => {
      try {
        const data = await fetchCatalog("browse", { category: active });
        if (myId !== browseReq.current) return;
        setBrowse({ loading: false, results: data.results || [], count: data.count || 0, failed: false });
      } catch (err) {
        console.error("Failed to browse category:", err);
        if (myId === browseReq.current) setBrowse({ loading: false, results: [], count: 0, failed: true });
      }
    })();
  }, [active, shuffleKey]);

  const pick = useCallback((name) => {
    setActive(name);
    const top = document.getElementById("discover-top");
    if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const cardProps = { addToCart, getCartItem, onCardClick };

  return (
    <div id="discover-top" style={styles.wrap}>
      {home && active && (
        <div className="cat-chips" role="tablist" aria-label="Medicine categories">
          <button
            role="tab"
            aria-selected={!active}
            className={`cat-chip${!active ? " active" : ""}`}
            onClick={() => setActive(null)}
          >
            All
          </button>
          {home.categories.map((c) => (
            <button
              key={c.name}
              role="tab"
              aria-selected={active === c.name}
              className={`cat-chip${active === c.name ? " active" : ""}`}
              onClick={() => pick(c.name)}
            >
              <span aria-hidden="true">{getMedicineEmoji(c.name)}</span>
              {c.name}
              <span className="cat-count">{c.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      )}

      {failed ? (
        <div style={styles.message}>
          <p style={styles.messageText}>Couldn't load the categories right now.</p>
          <button className="link-btn" onClick={() => setReloadKey((k) => k + 1)}>Try again</button>
          <p style={styles.rowNote}>You can still search for any medicine above.</p>
        </div>
      ) : !home ? (
        <Skeleton />
      ) : active ? (
        <section style={styles.section}>
          <div style={styles.rowHead}>
            <div>
              <h3 style={styles.rowTitle}>{active}</h3>
              <p style={styles.rowNote}>
                {browse.count.toLocaleString()} listed · a random selection — search above to find a specific medicine
              </p>
            </div>
            <div style={styles.rowActions}>
              <button className="link-btn" onClick={() => setShuffleKey((k) => k + 1)}>Show different ones</button>
              <button className="link-btn" onClick={() => setActive(null)}>All categories</button>
            </div>
          </div>
          {browse.loading ? (
            <Skeleton />
          ) : browse.failed ? (
            <div style={styles.message}>
              <p style={styles.messageText}>Couldn't load this category.</p>
              <button className="link-btn" onClick={() => setShuffleKey((k) => k + 1)}>Try again</button>
            </div>
          ) : (
            <div className="medicine-grid">
              {decorate(browse.results).map((med) => (
                <MedicineCard
                  key={med.slug}
                  med={med}
                  addToCart={addToCart}
                  cartItem={getCartItem(med)}
                  onCardClick={onCardClick}
                />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <Reveal>
            <CategoryTiles categories={home.categories} onPick={pick} />
          </Reveal>
          {suggested.length > 0 && (
            <Reveal>
              <Row
                title="Suggested for you"
                note="Based on the medicines you've looked at or added"
                items={decorate(suggested)}
                cardProps={cardProps}
              />
            </Reveal>
          )}
          {home.rows.map((r) => (
            <Reveal key={r.category}>
              <Row
                title={r.category}
                note={`${r.count.toLocaleString()} listed`}
                items={decorate(r.results)}
                onSeeAll={() => pick(r.category)}
                cardProps={cardProps}
              />
            </Reveal>
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  wrap: { maxWidth: "1200px", margin: "0 auto", scrollMarginTop: "96px" },
  section: { marginBottom: "36px" },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", marginBottom: "10px", flexWrap: "wrap" },
  rowTitle: { fontFamily: "'Space Grotesk', sans-serif", fontSize: "22px", fontWeight: "700", color: "#16241A", letterSpacing: "-0.3px" },
  rowNote: { fontSize: "13px", color: "#5B6B60", marginTop: "2px" },
  rowActions: { display: "flex", alignItems: "center", gap: "10px" },
  message: { textAlign: "center", padding: "48px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  messageText: { fontSize: "16px", fontWeight: "600", color: "#16241A" },
};

export default Discover;
