/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || "https://example.com",
  generateRobotsTxt: false,
  // Use transform to dynamically filter paths
  // Exclude portfolio internal sections and root
  transform: async (config, path) => {
    // Exclude portfolio internal sections, root, and special files
    const excludedPatterns = [
      /^\/$/,                        // root
      /^\/playground/,               // portfolio playground
      /^\/interaction-lab/,          // portfolio interaction lab
      /^\/engineering-note/,         // portfolio engineering note
      /^\/robots\.txt$/,             // robots.txt (handled by Next.js)
    ];

    const isExcluded = excludedPatterns.some(pattern => pattern.test(path));

    if (isExcluded) {
      return null;
    }

    return {
      loc: path,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.lastmod,
    };
  },
};
