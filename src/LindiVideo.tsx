export function LindiVideo({labelledBy}: {labelledBy: string}) {
  return (
    <video className="campaign-film-player" controls playsInline preload="none" width="512" height="910"
      aria-labelledby={labelledBy} poster="/media/lindis-story.webp">
      <source src="/media/lindis-story.mp4" type="video/mp4" />
      <a href="/media/lindis-story.mp4">Watch Lindi’s story as an MP4</a>
    </video>
  );
}
