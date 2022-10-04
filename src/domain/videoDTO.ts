export type VideoDTO = {
  /** uuid */
  videoId: string;
  src: string;
  posterSrc: string;
  captionSrc: string | null;
  title: string;
  description: string | null;
};
