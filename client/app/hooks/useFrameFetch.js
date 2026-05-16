import { useState, useEffect, useMemo } from 'react';
import { FRAME_PRESETS, DEFAULT_FRAME_SRC } from '../constants/layout';

export function useFrameFetch({ frameName, frameMode, frameSrc }) {
  const [communityPresets, setCommunityPresets] = useState([]);
  const [cmsTemplates, setCmsTemplates] = useState([]);

  useEffect(() => {
    const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';

    const fetchCommunityFrames = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/community/frames`);
        if (response.ok) {
          const json = await response.json();
          // Handle both array response and object with data property
          const frames = Array.isArray(json) ? json : (json.data || []);
          
          const mapped = frames.map(f => {
            let finalUrl = f.url;
            if (!finalUrl.startsWith('http')) {
              // Ensure no double slashes
              const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
              const cleanPath = f.url.startsWith('/') ? f.url : `/${f.url}`;
              finalUrl = `${cleanBase}${cleanPath}`;
            }
            return {
              id: f.id,
              label: f.title,
              mode: 'custom',
              src: finalUrl,
              description: `by ${f.author}`
            };
          });
          setCommunityPresets(mapped);
        }
      } catch (err) {
        console.error('Failed to load community presets:', err);
      }
    };

    // Fetch CMS frame templates
    const fetchCmsTemplates = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/cms/frames`);
        if (response.ok) {
          const json = await response.json();
          const templates = Array.isArray(json) ? json : [];
          setCmsTemplates(templates);
        }
      } catch (err) {
        console.error('Failed to load CMS templates:', err);
      }
    };

    fetchCommunityFrames();
    fetchCmsTemplates();
  }, []);

  // Convert CMS templates to preset format
  const cmsPresets = useMemo(() => {
    const API_BASE = globalThis.process?.env?.NEXT_PUBLIC_API_BASE || 'https://ldr-photobooth.if2372047.workers.dev';
    return cmsTemplates.map(t => {
      let thumbUrl = t.thumbnail_url;
      if (thumbUrl && !thumbUrl.startsWith('http')) {
        const cleanBase = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
        thumbUrl = `${cleanBase}${thumbUrl.startsWith('/') ? thumbUrl : '/' + thumbUrl}`;
      }
      return {
        id: `cms-${t.id}`,
        label: t.name,
        mode: 'template',
        src: thumbUrl,
        description: `${t.photo_count} foto · by ${t.author}`,
        photoCount: t.photo_count,
        template: t // Full template data including slots
      };
    });
  }, [cmsTemplates]);

  const framePresets = useMemo(() => {
    const basePresets = FRAME_PRESETS;
    
    // Gabungkan: Official + Community + CMS Templates
    const combined = [...basePresets, ...cmsPresets, ...communityPresets];

    if (frameName || (frameMode === 'custom' && frameSrc && frameSrc !== DEFAULT_FRAME_SRC)) {
      const customPreset = {
        id: 'upload',
        label: frameName ? `Upload: ${frameName}` : 'Custom Frame',
        mode: 'custom',
        src: frameSrc,
        description: 'Frame pilihanmu'
      };
      return [combined[0], customPreset, ...combined.slice(1)];
    }
    return combined;
  }, [frameName, frameMode, frameSrc, communityPresets, cmsPresets]);

  return {
    communityPresets,
    cmsTemplates,
    cmsPresets,
    framePresets
  };
}
