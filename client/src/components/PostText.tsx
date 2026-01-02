import { useLocation } from "wouter";

interface PostTextProps {
  text: string;
  className?: string;
}

export function PostText({ text, className = "" }: PostTextProps) {
  const [, setLocation] = useLocation();

  const parseText = (text: string) => {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    const parts: React.ReactNode[] = [];
    const regex = /(#\w+|@\w+)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      const tag = match[0];
      if (tag.startsWith('#')) {
        const hashtag = tag.slice(1);
        parts.push(
          <span
            key={match.index}
            className="text-primary font-semibold cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Hashtag clicked:', hashtag);
            }}
            data-testid={`hashtag-${hashtag}`}
          >
            {tag}
          </span>
        );
      } else if (tag.startsWith('@')) {
        const username = tag.slice(1);
        parts.push(
          <span
            key={match.index}
            className="text-primary font-semibold cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Mention clicked:', username);
            }}
            data-testid={`mention-${username}`}
          >
            {tag}
          </span>
        );
      }

      lastIndex = match.index + tag.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <span className={className}>
      {parseText(text)}
    </span>
  );
}
