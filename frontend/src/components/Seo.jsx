import { useEffect } from 'react';

const ensureMeta = (selector, create) => {
    let element = document.head.querySelector(selector);
    if (!element) {
        element = create();
        document.head.appendChild(element);
    }
    return element;
};

export default function Seo({
    title,
    description,
    robots = 'index, follow',
}) {
    useEffect(() => {
        const previousTitle = document.title;
        const descriptionMeta = ensureMeta('meta[name="description"]', () => {
            const meta = document.createElement('meta');
            meta.name = 'description';
            return meta;
        });
        const robotsMeta = ensureMeta('meta[name="robots"]', () => {
            const meta = document.createElement('meta');
            meta.name = 'robots';
            return meta;
        });
        const ogTitleMeta = ensureMeta('meta[property="og:title"]', () => {
            const meta = document.createElement('meta');
            meta.setAttribute('property', 'og:title');
            return meta;
        });
        const ogDescriptionMeta = ensureMeta('meta[property="og:description"]', () => {
            const meta = document.createElement('meta');
            meta.setAttribute('property', 'og:description');
            return meta;
        });

        if (title) {
            document.title = title;
            ogTitleMeta.setAttribute('content', title);
        }
        descriptionMeta.setAttribute('content', description || '');
        robotsMeta.setAttribute('content', robots);
        ogDescriptionMeta.setAttribute('content', description || '');

        return () => {
            document.title = previousTitle;
        };
    }, [description, robots, title]);

    return null;
}
