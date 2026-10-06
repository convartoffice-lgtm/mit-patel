# ConvArt launch trailer

50-second vertical (1080×1920, 30fps) launch trailer, with a convart.in website tour, for www.convart.in, built with
[OpenMontage](https://github.com/calesthio/OpenMontage)'s Remotion composer.

- `convart_launch_trailer.mp4`: final render
- `src/ConvartTrailer.tsx`: Remotion composition (footage cuts, CMYK block-wipe transitions, kinetic headlines, checklist, phone-mockup website tour with callouts, end card)
- `src/convart-index.tsx`: standalone Remotion entry point
- `src/convart-fonts.ts`: Poppins font inlined as base64
- `scripts/make_music.py`: synthesizes the 120 BPM music bed (`python make_music.py music50.wav 50 44.667`)
- `scripts/capture_website.mjs`: Playwright script that captures the convart.in mobile screenshots used in the tour

Narration uses Piper TTS (`en_US-lessac-high`, with EQ, compression and loudness normalisation). Sound effects come from OpenMontage's bundled Pixabay SFX.
To re-render, copy `src/*` into `OpenMontage/remotion-composer/src/` and put the cut footage, voice-over,
music, SFX and logo under `remotion-composer/public/convart/`, then run:

    npx remotion render src/convart-index.tsx ConvartTrailer out/convart_launch_trailer.mp4
