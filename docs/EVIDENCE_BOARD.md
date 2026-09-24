# Touch Evidence Board

## Purpose

The Evidence Board is a dedicated full-screen investigation instrument for arranging recovered artifacts on a physical case wall. It deliberately avoids node-editor conventions: there are no graph ports, developer handles, grid widgets, minimap panels, or desktop mouse interactions.

The presentation uses cork, wood seams, thumbtacks, tape, paper, photographs, receipt stock, message captures, CCTV frames, shadows, and physical strings. Evidence types retain distinct artifact treatments instead of becoming uniform graph nodes.

## Touch interaction model

The board is designed around phone and tablet gestures:

- **One-finger drag on an artifact** moves only that artifact.
- **Two-finger pan** moves the wall while leaving artifacts fixed in world space.
- **Pinch** scales the wall around the gesture focal point.
- **Long press** lifts an artifact and opens its contextual investigation tools.
- **Single tap** provides a faster accessible selection path and completes connection or multi-selection modes.

Artifact drag distance is normalized against board zoom so evidence remains directly under the finger at every scale. One-finger artifact gestures are simultaneous with the wall's two-finger gestures, allowing a second touch to transition into wall navigation without adding a one-finger background pan.

## Physical motion

Gesture motion runs on the native UI thread through React Native Gesture Handler and Reanimated shared values.

During a drag:

- the artifact lifts and scales slightly;
- horizontal movement introduces a small temporary rotation;
- the active artifact rises above the rest of the wall;
- attached strings and collection outlines follow its live shared position.

On release, projected velocity selects a bounded resting point. Position, scale, and rotation settle with spring physics. The stable authored rotation returns naturally rather than snapping. Reduced-motion settings replace persistence synchronization animation where appropriate, while the default interaction remains spring based.

Two-finger panning also projects velocity and settles through a spring. Pinch navigation keeps the touched world point under the gesture focal point.

## Connections and contradictions

The board reuses deterministic `CONNECT_EVIDENCE` and `DISCONNECT_EVIDENCE` actions. Connections remain stable engine-derived records with endpoint evidence IDs and a closed relation kind:

- related;
- supports;
- sequence;
- contradicts.

Normal relations render as physical string colors. Contradictions use a rust-red dashed string and a central contradiction marker, not a generic graph edge style.

Long pressing or selecting an artifact opens the touch tool shelf. Choosing Connect or Contradict enters an explicit target-selection mode; tapping a second artifact dispatches the engine action. Self-connections and duplicates return typed engine errors without mutating state.

## Groups and theory clusters

Group and theory commands enter a large-target multi-selection mode. The player taps at least two discovered artifacts and confirms from the bottom tray.

- **Evidence groups** create a dashed hand-marked boundary with a paper label. Creating a new group reassigns selected artifacts from earlier groups.
- **Theory clusters** create an independent rust field around selected artifacts. Clusters can overlap groups because a physical filing category and a speculative theory serve different purposes.

Groups and theory clusters have deterministic IDs based on engine turns. Context tools allow a selected artifact's group or theory cluster to be removed.

## Persistent board state

`CasePlayerState.evidenceBoard` stores only player-authored interaction state:

```ts
{
  placements: Record<EvidenceId, {
    evidenceId: string,
    x: number,
    y: number,
    rotation: number,
    zIndex: number,
  }>,
  viewport: { x: number, y: number, scale: number },
  groups: EvidenceBoardGroup[],
  theoryClusters: TheoryCluster[],
}
```

The world is device-independent and fixed at 1800 by 1400 units. Newly discovered evidence receives a deterministic initial placement based on authored evidence order and a stable ID-derived resting rotation. Existing placements never change when new evidence is discovered.

Movement is committed only at gesture settlement, avoiding AsyncStorage writes on every animation frame. Viewport changes persist at the end of pan and pinch gestures. Live movement remains on the UI thread while strings and outlines follow shared positions.

The case-session store uses schema version 4. Version 1–3 sessions migrate to an empty board while preserving prior evidence and Case Net progress.

## Engine actions

Board state is updated only through deterministic actions:

- `PLACE_DISCOVERED_EVIDENCE_ON_BOARD`
- `MOVE_EVIDENCE_ON_BOARD`
- `SET_EVIDENCE_BOARD_VIEWPORT`
- `CREATE_EVIDENCE_BOARD_GROUP`
- `DELETE_EVIDENCE_BOARD_GROUP`
- `CREATE_THEORY_CLUSTER`
- `DELETE_THEORY_CLUSTER`

Coordinates, scale, rotation, discovered evidence membership, and multi-selection cardinality are validated before state changes. Invalid actions preserve the original state reference.

## Native route

```text
/board    Full-screen native Evidence Board modal
```

The Leads tab keeps the deterministic deduction desk and launches the board through a dedicated touch-wall control. Closing the board returns to that investigation context.

## Verification

The deterministic engine suite verifies initial placement, idempotent discovery synchronization, position/rotation/z-order persistence, viewport persistence, JSON serialization, evidence grouping, theory clusters, contradiction relations, and invalid selection rejection.
