# ConvArt launch trailer

30-second vertical (1080×1920, 30fps) launch trailer for www.convart.in, built with
[OpenMontage](https://github.com/calesthio/OpenMontage)'s Remotion composer.

- `convart_launch_trailer.mp4`: final render
- `src/ConvartTrailer.tsx`: Remotion composition (footage cuts, CMYK block-wipe transitions, kinetic headlines, checklist, end card)
- `src/convart-index.tsx`: standalone Remotion entry point
- `src/convart-fonts.ts`: Poppins font inlined as base64
- `scripts/make_music.py`: synthesizes the 120 BPM music bed

Narration uses Piper TTS (`en_US-ryan-high`). Sound effects come from OpenMontage's bundled Pixabay SFX.
To re-render, copy `src/*` into `OpenMontage/remotion-composer/src/` and put the cut footage, voice-over,
music, SFX and logo under `remotion-composer/public/convart/`, then run:

    npx remotion render src/convart-index.tsx ConvartTrailer out/convart_launch_trailer.mp4
