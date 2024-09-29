'use strict';

import { Game, PLAYER, GAME_RESULT, DIFFICULTY, DEFAULT_BOARD } from './tic-tac-toe.mjs';

const $grid = () => document.querySelector('#grid');

const $playStop = document.querySelector('#play-stop');

const $x = document.querySelector('#x');
const $o = document.querySelector('#o');
const $tie = document.querySelector('#tie');
const results = [$x, $o, $tie];

const $difficulty = document.querySelector('#difficulty');
const $minimax = document.querySelector('#minimax');

let isPlaying = false;
let replayTimeoutId = null;

const recreateGrid = () => {
    const createCells = (row, col) => {
        if (row >= 3) return '';

        const li = document.createElement('li');
        li.innerHTML = `<button class="button" type="button" data-row="${row}" data-col="${col}"></button>`;

        return [li, ...(col < 2 ? createCells(row, col + 1) : createCells(row + 1, 0))];
    };

    $grid().replaceChildren(...createCells(0, 0));
};

const recreateScoreValue = (result) => {
    const span = document.createElement('span');
    span.classList.add('value');

    const resultElem = (() => {
        switch (result) {
            case GAME_RESULT.x:
                return $x;
            case GAME_RESULT.o:
                return $o;
            case GAME_RESULT.tie:
                return $tie;
        }
    })();

    const valueElem = resultElem.lastChild;
    span.textContent = Number(valueElem.textContent) + 1;
    resultElem.replaceChild(span, valueElem);
};

const recreateMark = (index, player) => {
    if (index === -1) return;

    const mark = document.createElement('div');
    mark.classList.add(player === PLAYER.o ? 'circle' : 'cross');

    $grid().children[index].firstChild.appendChild(mark);
};

const highlightScore = () => {
    const maxValue = Math.max(...results.map((item) => Number(item.lastChild.textContent)));

    results.forEach((item) => {
        const value = Number(item.lastChild.textContent);
        item.classList.toggle('winner', value === maxValue && value > 0);
    });
};

const resetScore = () => {
    results.forEach((result) => (result.lastChild.textContent = 0));
    highlightScore();
};

const play = async (gen, prevBoard) => {
    if (!isPlaying) return;

    const { done, value } = await gen.next();

    if (done) {
        replayTimeoutId = setTimeout(() => {
            recreateGrid();
            play(value.restart(), DEFAULT_BOARD);
        }, 2000);

        recreateScoreValue(value.result);
        highlightScore();

        return;
    }

    recreateMark(
        value.board.flat().findIndex((cell, idx) => cell !== prevBoard.flat()[idx]),
        value.player.prev,
    );

    play(gen, value.board);
};

const resolver = (res) => {
    const callback = (e) => {
        const target = e.target;

        if (target.nodeName !== 'BUTTON') return;

        res({
            rowIdx: e.target.dataset.row,
            colIdx: e.target.dataset.col,
        });

        $grid().removeEventListener('click', callback);
    };

    $grid().addEventListener('click', callback);
};

const getDifficulty = () => {
    switch ($difficulty.querySelector('input:checked').value) {
        case 'easy': {
            return DIFFICULTY.easy;
        }
        case 'medium': {
            return DIFFICULTY.medium;
        }
        case 'hard': {
            return DIFFICULTY.hard;
        }
        case 'max': {
            return DIFFICULTY.max;
        }
    }
};

$playStop.addEventListener('click', () => {
    const toggleDisabledStates = () => {
        $difficulty.querySelectorAll('input').forEach((input) => (input.disabled = !input.disabled));
        $grid()
            .querySelectorAll('button')
            .forEach((btn) => (btn.disabled = !btn.disabled));
    };

    if (isPlaying) {
        isPlaying = false;
        $playStop.textContent = 'Play';

        resetScore();
        recreateGrid();
        toggleDisabledStates();

        $grid().replaceWith($grid().cloneNode(true));
        clearTimeout(replayTimeoutId);
    } else {
        isPlaying = true;
        $playStop.textContent = 'Stop';

        toggleDisabledStates();

        play(Game(resolver, $minimax.checked, getDifficulty()).play(), DEFAULT_BOARD);
    }
});
