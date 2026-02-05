import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_SMOOTH } from "../../motion/presets";
import { useTranslation } from 'react-i18next';


const GRID_SIZE = 320;
const LINE_PX = 4;
const GRID_YELLOW = "#D4AF37";
const X_PINK = "#DC00D3";
const O_BLUE = "#00CFFF";

function MarkX({ preview = false }: { preview?: boolean }) {
  const stroke = preview ? "rgba(220, 0, 211, 0.45)" : X_PINK;
  return (
    <motion.svg
      width={64}
      height={64}
      viewBox="0 0 100 100"
      className={preview ? "" : "drop-shadow-[0_0_10px_#DC00D3]"}
      aria-hidden="true"
    >
      <motion.path
        d="M22 22 L78 78"
        stroke={stroke}
        strokeWidth={LINE_PX}
        strokeLinecap="round"
        initial={preview ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0.9 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: preview ? 0 : 0.22, ease: "easeOut" }}
      />
      <motion.path
        d="M78 22 L22 78"
        stroke={stroke}
        strokeWidth={LINE_PX}
        strokeLinecap="round"
        initial={preview ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0.9 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: preview ? 0 : 0.22, ease: "easeOut", delay: preview ? 0 : 0.06 }}
      />
    </motion.svg>
  );
}

function MarkO() {
  return (
    <motion.svg
      width={64}
      height={64}
      viewBox="0 0 100 100"
      className="drop-shadow-[0_0_10px_#00CFFF]"
      aria-hidden="true"
    >
      <motion.circle
        cx="50"
        cy="50"
        r="28"
        fill="none"
        stroke={O_BLUE}
        strokeWidth={LINE_PX}
        initial={{ pathLength: 0, opacity: 0.9 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      />
    </motion.svg>
  );
}

function getLineEndpoints(line: number[]) {
  const cell = GRID_SIZE / 3;
  const [a, , c] = line;
  const ax = ((a % 3) + 0.5) * cell;
  const ay = (Math.floor(a / 3) + 0.5) * cell;
  const cx = ((c % 3) + 0.5) * cell;
  const cy = (Math.floor(c / 3) + 0.5) * cell;
  return { x1: ax, y1: ay, x2: cx, y2: cy };
}

function calculateWinner(squares: string[]) {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (
      squares[a] &&
      squares[a] === squares[b] &&
      squares[a] === squares[c]
    ) {
      return { winner: squares[a], line: lines[i] };
    }
  }
  return null;
}

export function XOGame() {
  const { t, i18n } = useTranslation();
  const [squares, setSquares] = useState(Array(9).fill(""));
  const [xIsNext, setXIsNext] = useState(true); // X is user, O is AI
  const [gameOver, setGameOver] = useState(false);
  const [hoveredCell, setHoveredCell] = useState<number | null>(null);
  const [hasPlayedFirstIntro, setHasPlayedFirstIntro] = useState(false);
  const result = calculateWinner(squares);
  const winner = result?.winner ?? null;
  let winLine = result?.line ?? null;
  // Flip cross and vertical win lines for Arabic
  const isArabic = i18n.language?.startsWith('ar');
  if (winLine && isArabic) {
    // Flip diagonals
    if (winLine.length === 3 && winLine[0] === 0 && winLine[1] === 4 && winLine[2] === 8) winLine = [2,4,6];
    else if (winLine.length === 3 && winLine[0] === 2 && winLine[1] === 4 && winLine[2] === 6) winLine = [0,4,8];
    // Flip verticals: [0,3,6] <-> [2,5,8]
    else if (winLine.length === 3 && winLine[0] === 0 && winLine[1] === 3 && winLine[2] === 6) winLine = [2,5,8];
    else if (winLine.length === 3 && winLine[0] === 2 && winLine[1] === 5 && winLine[2] === 8) winLine = [0,3,6];
  }
  const isDraw = !winner && squares.every((sq) => sq);
  const winningCells = winLine ? new Set(winLine) : null;

  const boardAnim =
    winner === "X"
      ? "win"
      : winner === "O"
        ? "lose"
        : isDraw
          ? "draw"
          : "idle";

  // Minimax AI for harder gameplay
  function minimax(board: string[], isMax: boolean): { score: number, move: number | null } {
    const result = calculateWinner(board);
    if (result?.winner === "O") return { score: 1, move: null };
    if (result?.winner === "X") return { score: -1, move: null };
    if (board.every((sq) => sq)) return { score: 0, move: null };

    let bestMove: number | null = null;
    let bestScore = isMax ? -Infinity : Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === "") {
        board[i] = isMax ? "O" : "X";
        const { score } = minimax(board, !isMax);
        board[i] = "";
        if (isMax) {
          if (score > bestScore) {
            bestScore = score;
            bestMove = i;
          }
        } else {
          if (score < bestScore) {
            bestScore = score;
            bestMove = i;
          }
        }
      }
    }
    return { score: bestScore, move: bestMove };
  }

  React.useEffect(() => {
    if (!xIsNext && !winner && !isDraw && !gameOver) {
      const timeout = setTimeout(() => {
        // 10% chance to play randomly, 90% minimax
        let move: number | null = null;
        if (Math.random() < 0.1) {
          const empty = squares.map((v, i) => v === "" ? i : null).filter((v) => v !== null) as number[];
          if (empty.length > 0) move = empty[Math.floor(Math.random() * empty.length)];
        } else {
          move = minimax([...squares], true).move;
        }
        if (move !== null && squares[move] === "") {
          const nextSquares = squares.slice();
          nextSquares[move] = "O";
          setSquares(nextSquares);
          setXIsNext(true);
        }
      }, 600);
      return () => clearTimeout(timeout);
    }
    if (winner || isDraw) setGameOver(true);
  }, [xIsNext, squares, winner, isDraw, gameOver]);

  function handleClick(i: number) {
    if (squares[i] || winner || !xIsNext || gameOver) return;
    const nextSquares = squares.slice();
    nextSquares[i] = "X";
    setSquares(nextSquares);
    setXIsNext(false);
  }

  function resetGame() {
    setSquares(Array(9).fill(""));
    setXIsNext(true);
    setGameOver(false);
    setHoveredCell(null);
  }

  let status = "";
  if (winner) {
    status = winner === "X" ? t('xo.status.win') : t('xo.status.lose');
  } else if (isDraw) {
    status = t('xo.status.draw');
  } else {
    status = xIsNext ? t('xo.status.yourTurn') : t('xo.status.aiThinking');
  }

  return (
    <motion.section
      id="xo-game"
      className="py-24 bg-[#0B021C] relative flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      onAnimationComplete={() => {
        if (!hasPlayedFirstIntro) setHasPlayedFirstIntro(true);
      }}
      transition={{
        duration: hasPlayedFirstIntro ? 0.7 : 1.05,
        delay: hasPlayedFirstIntro ? 0 : 0.12,
        ease: EASE_SMOOTH,
      }}
      viewport={{ once: false, amount: 0.3 }}
    >
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-4xl font-bold font-['Josefin_Sans'] text-white mb-16 text-center"
      >
        {t('xo.headingTop')} <span className="text-[#DC00D3] drop-shadow-[0_0_12px_#DC00D3]">{t('xo.headingAccent')}</span>
      </motion.h2>
      <motion.div
        className="relative"
        style={{ width: GRID_SIZE, height: GRID_SIZE }}
        animate={boardAnim}
        variants={{
          idle: { x: 0, y: 0, scale: 1 },
          win: {
            scale: [1, 1.03, 1],
            y: [0, -6, 0],
            transition: { duration: 0.6, ease: "easeOut" },
          },
          lose: {
            x: [0, -14, 14, -12, 12, -8, 8, 0],
            transition: { duration: 0.55, ease: "easeOut" },
          },
          draw: {
            scale: [1, 1.01, 1],
            transition: { duration: 0.45, ease: "easeOut" },
          },
        }}
      >
        {/* Glowing internal grid lines only (no outer border) */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* vertical lines */}
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: `calc(33.333% - ${LINE_PX / 2}px)`,
              width: LINE_PX,
              background: GRID_YELLOW,
              boxShadow: `0 0 10px ${GRID_YELLOW}, 0 0 22px ${GRID_YELLOW}`,
            }}
          />
          <div
            className="absolute top-0 bottom-0"
            style={{
              left: `calc(66.666% - ${LINE_PX / 2}px)`,
              width: LINE_PX,
              background: GRID_YELLOW,
              boxShadow: `0 0 10px ${GRID_YELLOW}, 0 0 22px ${GRID_YELLOW}`,
            }}
          />
          {/* horizontal lines */}
          <div
            className="absolute left-0 right-0"
            style={{
              top: `calc(33.333% - ${LINE_PX / 2}px)`,
              height: LINE_PX,
              background: GRID_YELLOW,
              boxShadow: `0 0 10px ${GRID_YELLOW}, 0 0 22px ${GRID_YELLOW}`,
            }}
          />
          <div
            className="absolute left-0 right-0"
            style={{
              top: `calc(66.666% - ${LINE_PX / 2}px)`,
              height: LINE_PX,
              background: GRID_YELLOW,
              boxShadow: `0 0 10px ${GRID_YELLOW}, 0 0 22px ${GRID_YELLOW}`,
            }}
          />
        </div>

        {/* Winning line */}
        <AnimatePresence>
          {winLine && (
            <motion.svg
              key="win-line"
              className="absolute inset-0 pointer-events-none"
              width={GRID_SIZE}
              height={GRID_SIZE}
              viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-hidden="true"
            >
              <motion.line
                {...getLineEndpoints(winLine)}
                stroke={GRID_YELLOW}
                strokeWidth={LINE_PX + 1}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 10px ${GRID_YELLOW}) drop-shadow(0 0 22px ${GRID_YELLOW})` }}
              />
              {/* pulse the winning line a bit */}
              <motion.line
                {...getLineEndpoints(winLine)}
                stroke={GRID_YELLOW}
                strokeWidth={LINE_PX + 1}
                strokeLinecap="round"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0] }}
                transition={{ duration: 0.9, repeat: 2, ease: "easeOut" }}
                style={{ filter: `drop-shadow(0 0 12px ${GRID_YELLOW}) drop-shadow(0 0 26px ${GRID_YELLOW})` }}
              />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Clickable cells */}
        <div className="grid grid-cols-3 grid-rows-3 w-full h-full">
          {squares.map((val, i) => (
            <motion.button
              key={i}
              className="flex items-center justify-center bg-transparent select-none"
              onClick={() => handleClick(i)}
              disabled={!!val || !xIsNext || gameOver}
              aria-label={t('xo.cellAria', { n: i + 1 })}
              onMouseEnter={() => setHoveredCell(i)}
              onMouseLeave={() => setHoveredCell((prev) => (prev === i ? null : prev))}
              whileHover={!val && xIsNext && !gameOver ? { scale: 1.03 } : undefined}
              whileTap={!val && xIsNext && !gameOver ? { scale: 0.97 } : undefined}
              transition={{ type: "spring", stiffness: 520, damping: 34 }}
            >
              {val === "X" ? (
                <motion.div
                  animate={gameOver && winningCells?.has(i) ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <MarkX />
                </motion.div>
              ) : val === "O" ? (
                <motion.div
                  animate={gameOver && winningCells?.has(i) ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  <MarkO />
                </motion.div>
              ) : hoveredCell === i && xIsNext && !gameOver ? (
                <MarkX preview />
              ) : null}
            </motion.button>
          ))}
        </div>
      </motion.div>
      <div className="mt-6 text-lg text-white font-semibold min-h-[28px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            {status}
          </motion.div>
        </AnimatePresence>
      </div>
      {gameOver && (
        <motion.button
          className="mt-4 px-6 py-2 rounded-full bg-gradient-to-r from-[#DC00D3] via-[#D4AF37] to-[#DC00D3] text-white font-bold shadow-lg border border-white/20"
          onClick={resetGame}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 520, damping: 30 }}
        >
          {t('xo.tryAgain')}
        </motion.button>
      )}
    </motion.section>
  );
}
