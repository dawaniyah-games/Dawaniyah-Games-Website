import React from 'react';

/**
 * One line of the hero's H1, split into the pieces the bird stands on and moves: letters in English,
 * whole words in Arabic, where splitting a word would break its joining. Screen readers get the line as
 * words, once.
 */
export function HeadlineLine({ text, rtl }: { text: string; rtl: boolean }) {
  return (
    <span className="block">
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(' ').map((word, wordIndex) => (
          <React.Fragment key={`${word}-${wordIndex}`}>
            {wordIndex > 0 && ' '}
            {rtl ? (
              <span data-bird-piece="" className="inline-block origin-bottom">
                {word}
              </span>
            ) : (
              <span className="whitespace-nowrap">
                {Array.from(word).map((letter, letterIndex) => (
                  <span key={letterIndex} data-bird-piece="" className="inline-block origin-bottom">
                    {letter}
                  </span>
                ))}
              </span>
            )}
          </React.Fragment>
        ))}
      </span>
    </span>
  );
}
