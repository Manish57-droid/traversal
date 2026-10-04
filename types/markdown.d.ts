// .md files are bundled as raw strings via the asset/source rule in
// next.config.js (used by lib/interview-guides).
declare module "*.md" {
  const content: string;
  export default content;
}
