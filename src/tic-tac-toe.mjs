'use strict';

const PLAYER = Object.freeze({
    x: Symbol('Player X'),
    o: Symbol('Player O'),
});

const GAME_RESULT = Object.freeze({
    x: Symbol('Player X wins'),
    o: Symbol('Player O wins'),
    tie: Symbol('Tie'),
});

const DEFAULT_BOARD = Object.freeze([
    [null, null, null],
    [null, null, null],
    [null, null, null],
]);

const DIFFICULTY = Object.freeze({
    easy: 2,
    medium: 4,
    hard: 6,
    max: Number.MAX_VALUE,
});

const Board = (board = DEFAULT_BOARD) => ({
    state: () => board.map((row) => [...row]),
    placeMark: (rowIdx, colIdx, mark) => {
        if (board[rowIdx][colIdx] !== null) {
            return Board(board);
        }

        const newBoard = board.map((row) => [...row]);
        newBoard[rowIdx][colIdx] = mark;

        return Board(newBoard);
    },
    getResult: () => {
        const checkRowEq = ([a, b, c]) => a && a == b && b == c;
        const checkBoard = (board) => [...board, [board[0][0], board[1][1], board[2][2]]].filter(checkRowEq)[0]?.[0];

        const rotatedBoard = board[0].map((_, colIdx) => board.map((row) => row[colIdx])).reverse();

        const winner = checkBoard(board) || checkBoard(rotatedBoard) || null;

        if (winner === PLAYER.x) return GAME_RESULT.x;
        if (winner === PLAYER.o) return GAME_RESULT.o;
        if (winner === null && board.flat().every(Boolean)) return GAME_RESULT.tie;
        return null;
    },
    getAvlIdxs: () => {
        return board.reduce((acc, row, rowIdx) => {
            row.forEach((cell, colIdx) => {
                if (cell === null) {
                    acc.push({ rowIdx, colIdx });
                }
            });

            return acc;
        }, []);
    },
    getBestMove: (maximizer, maxDepth) => {
        const minimizer = maximizer === PLAYER.o ? PLAYER.x : PLAYER.o;

        const getResultByPlayer = (player) => {
            if (player === PLAYER.x) return GAME_RESULT.x;
            if (player === PLAYER.o) return GAME_RESULT.o;
            return null;
        };

        const minimax = (players, board, depth) => {
            const result = board.getResult();

            if (result === getResultByPlayer(maximizer)) {
                return { score: 100 - depth };
            }

            if (result === getResultByPlayer(minimizer)) {
                return { score: -100 + depth };
            }

            if (result === GAME_RESULT.tie || depth === maxDepth) {
                return { score: 0 };
            }

            const moves = board.getAvlIdxs().map((move) => {
                const newBoard = board.placeMark(move.rowIdx, move.colIdx, players.current());
                const { score, bestMove } = minimax(players.rotate(), newBoard, depth + 1);

                return { score, move: bestMove || move };
            });

            const getBestMove = (comparator) => {
                const bestScore = comparator(...moves.map((move) => move.score));
                const bestMoves = moves.filter((move) => move.score === bestScore);

                return bestMoves.length === 1 ? bestMoves[0] : bestMoves[Math.floor(Math.random() * bestMoves.length)];
            };

            return getBestMove(players.current() === maximizer ? Math.max : Math.min);
        };

        return minimax(Players([maximizer, minimizer]), Board(board), 0).move || null;
    },
});

const Players = ([first, second] = [PLAYER.x, PLAYER.o]) => ({
    state: () => [first, second],
    current: () => first,
    rotate: () => Players([second, first]),
});

const Game = (resolver, useMinimax, difficulty) => ({
    play: () => {
        async function* gen(players, board) {
            const result = board.getResult();

            if (result !== null) {
                return {
                    result,
                    restart: () => gen(Players(), Board()),
                };
            }

            const { rowIdx, colIdx } =
                players.current() === PLAYER.o && useMinimax ?
                    board.getBestMove(PLAYER.o, difficulty)
                :   await new Promise(resolver);

            const isEqBoards = (first, other) => {
                const otherState = other.state();
                const firstState = first.state();

                return firstState.every((row, rowIdx) =>
                    row.every((cell, colIdx) => cell === otherState[rowIdx][colIdx]),
                );
            };

            const newBoard = board.placeMark(rowIdx, colIdx, players.current());
            const newPlayers = isEqBoards(board, newBoard) ? players : players.rotate();

            yield {
                board: newBoard.state(),
                player: {
                    prev: players.current(),
                    current: newPlayers.current(),
                },
            };

            return yield* gen(newPlayers, newBoard);
        }

        return gen(Players(), Board());
    },
});

export { Game, PLAYER, GAME_RESULT, DIFFICULTY, DEFAULT_BOARD };
