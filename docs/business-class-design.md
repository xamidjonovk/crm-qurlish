# Business-class exterior concept

2026-11-06: generated with the built-in imagegen tool. Style references: [Regnum Plaza project](https://mbc.uz/project/regnum-plaza), its facade and courtyard photographs. Reference photographs are used for design direction only and are not shipped as product assets.

The original generated proposal uses copper portal frames, warm clinker, limestone, recessed dark glazing and planted courtyard lounges. The interactive scene follows these materials and landscape elements while retaining inventory-controlled building positions, floor counts and apartment selection. The generated image is a concept presentation; it is not a live inventory view or a measured site plan.

Project asset: `frontend/public/assets/residence/business-class-exterior-v2.webp`. Original output is retained under `.codex/generated_images` and copied to the ignored `private-files/business-class-exterior-v2.png`.

The optimized asset is 1536×1024, 567,302 bytes, loaded only when the design dialog opens. The dialog supports Escape, native focus trapping and focus return. Frontend validation: TypeScript and production build passed; four existing residence browser tests passed, followed by the updated render test after fixing dialog focus return. The render test covers desktop/mobile concept display, live 3D navigation, floor picking, camera isolation, interior orbit and idle rendering. Screenshots were reviewed. No backend schema or inventory records were changed for this redesign.

## Final imagegen prompt

```text
Use case: stylized-concept.
Asset type: photorealistic architectural exterior and courtyard redesign concept for an existing interactive real-estate CRM, landscape 3:2.
Input images: Image 1 is a facade style reference from Regnum Plaza, Image 2 is its landscaped courtyard reference. These are STYLE REFERENCES, not buildings to copy exactly.
Primary request: design a coherent modern business-class residential residence in Tashkent comprising EXACTLY FOUR separate rectangular apartment buildings of EXACTLY SEVEN floors each, arranged as a spacious two-by-two cluster around an enclosed central landscaped courtyard. Respect seven floors, no towers, no extra buildings within the site. Adapt the reference's rich copper anodized aluminum framing, textured light-brown clinker brick, warm limestone, tall charcoal aluminum window frames, deep shadowed recessed loggias, smoked glass balcony balustrades. Strong two-story vertical copper portal compositions, less horizontal white-strip architecture. Dark elegant ground-floor entry portals and integrated discreet linear lighting. Flat roofs with concealed mechanical equipment and small planted roof terrace strips.
Courtyard: refined car-free landscape between all four buildings, generous layered planting with mature trees and textured low shrubs, warm large stone paving, a gently curved rust-red walking loop, two timber-slat pergola lounges with seats, planted stone-edged garden islands, discreet black bollard lighting, a small play corner in muted earth colors. Enclosing low stone walls and dark metal railing with an elegant central pedestrian entry. Parked cars only along the outer street. All buildings and the full enclosed courtyard visible.
Composition: elevated three-quarter architectural drone photograph from above the front corner, camera about 40 degrees downward, all four seven-story buildings comfortably inside frame, courtyard visible between them. Natural scale and physically plausible materials, architectural photography, detailed brick mortar, glass reflections, varied foliage and soft realistic shadows. Not an isometric toy, not a miniature, no cartoon, no plastic, no flat illustration.
Lighting: clear late-afternoon daylight with restrained warm sunlight, neutral color balance, no orange filter, no bloom, no oversaturation. Sophisticated attainable contemporary business-class housing.
Constraints: no text, no logos, no watermark, no UI, no green/red inventory overlays. This is an original proposed concept inspired by the references, not a photograph of Regnum Plaza.
```
