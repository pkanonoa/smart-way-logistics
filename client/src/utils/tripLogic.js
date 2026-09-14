// ─── Trip Logic Utilities ─────────────────────────────────────────────────────
// Pure functions for optimistic local state management in TripBuilderPage.
// These are used for instant visual feedback while API requests are in-flight.
// After every API call the client REPLACES local state with the server response.
//
// Canonical location-match rule (must stay identical to server implementation):
//   case-insensitive, whitespace-trimmed string equality.
//   a.trim().toLowerCase() === b.trim().toLowerCase()
//   role must also match exactly ("pickup" | "drop").

const locMatch = (a, b) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Add a waybill to a stops array using merge-by-location.
 *
 * Rules (from spec):
 *  - Pickup stops are inserted BEFORE the first existing drop stop in sequence.
 *  - Drop stops are appended at the end.
 *  - If a stop with the same location + role already exists, a new StopItem is
 *    attached to it rather than creating a duplicate stop.
 *
 * @param {Stop[]} stops     Current stops array (ordered by sequence)
 * @param {object} waybill   { id, waybillNumber, consigneeName, pickupLoc, dropLoc, weight }
 * @returns {Stop[]}         New stops array (immutable)
 */
export function mergeWaybillIntoStops(stops, waybill) {
  const { id: waybillId, waybillNumber, consigneeName, pickupLoc, dropLoc, weight } = waybill;

  let newStops = [...stops];

  // Helper: add waybill item to a stop or create new stop
  function addToRole(role, location) {
    const existing = newStops.find(
      (s) => s.role === role && locMatch(s.location, location)
    );

    if (existing) {
      // Merge into existing stop
      return newStops.map((s) =>
        s.id === existing.id
          ? {
              ...s,
              items: [
                ...s.items,
                { id: `tmp_${Date.now()}_${Math.random()}`, waybillId, waybillNumber, consigneeName, weight },
              ],
            }
          : s
      );
    } else {
      // Create new stop
      const newStop = {
        id: `tmp_${Date.now()}_${Math.random()}`,
        location,
        role,
        items: [{ id: `tmp_${Date.now()}_${Math.random()}`, waybillId, waybillNumber, consigneeName, weight }],
      };

      if (role === 'pickup') {
        // Insert before the first drop stop
        const firstDropIdx = newStops.findIndex((s) => s.role === 'drop');
        if (firstDropIdx === -1) {
          newStops = [...newStops, newStop];
        } else {
          newStops = [
            ...newStops.slice(0, firstDropIdx),
            newStop,
            ...newStops.slice(firstDropIdx),
          ];
        }
      } else {
        // Append drop stop at end
        newStops = [...newStops, newStop];
      }

      return newStops;
    }
  }

  newStops = addToRole('pickup', pickupLoc);
  newStops = addToRole('drop', dropLoc);

  // Re-sequence: assign sequence numbers 1..n
  return newStops.map((s, i) => ({ ...s, sequence: i + 1 }));
}

/**
 * Compute running cumulative weight at each stop in sequence order.
 * +weight at pickup, -weight at drop.
 *
 * @param {Stop[]} stops  Ordered stops array (each with .role, .items[].weight)
 * @returns {{ stopId, runningLoad }[]}
 */
export function computeRunningLoad(stops) {
  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);
  let running = 0;
  return ordered.map((stop) => {
    const stopWeight = stop.items.reduce(
      (sum, item) => sum + parseFloat(item.weight || 0),
      0
    );
    if (stop.role === 'pickup') {
      running += stopWeight;
    } else {
      running -= stopWeight;
    }
    return { stopId: stop.id, runningLoad: Math.max(0, running) };
  });
}

/**
 * Compute the peak (maximum) running load across all stops.
 * This is the value used for vehicle capacity checks.
 *
 * @param {Stop[]} stops
 * @returns {number}
 */
export function peakLoad(stops) {
  if (!stops.length) return 0;
  const loads = computeRunningLoad(stops);
  return Math.max(0, ...loads.map((r) => r.runningLoad));
}

/**
 * Swap a stop with its neighbor in the sequence (up = lower sequence, down = higher).
 *
 * @param {Stop[]} stops
 * @param {string} stopId
 * @param {'up'|'down'} direction
 * @returns {Stop[]}  New stops array with updated sequences
 */
export function reorderStop(stops, stopId, direction) {
  const ordered = [...stops].sort((a, b) => a.sequence - b.sequence);
  const idx = ordered.findIndex((s) => s.id === stopId);
  if (idx === -1) return stops;

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= ordered.length) return stops;

  const swapped = [...ordered];
  [swapped[idx], swapped[swapIdx]] = [swapped[swapIdx], swapped[idx]];

  return swapped.map((s, i) => ({ ...s, sequence: i + 1 }));
}

/**
 * Remove a stop and re-sequence the remaining stops.
 *
 * @param {Stop[]} stops
 * @param {string} stopId
 * @returns {Stop[]}
 */
export function removeStop(stops, stopId) {
  return stops
    .filter((s) => s.id !== stopId)
    .sort((a, b) => a.sequence - b.sequence)
    .map((s, i) => ({ ...s, sequence: i + 1 }));
}
