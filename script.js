const grid = document.getElementById('sudoku-grid');
const difficultySelect = document.getElementById('difficulty');
const fontStyleSelect = document.getElementById('font-style');
const newGameBtn = document.getElementById('new-game');
const checkSolutionBtn = document.getElementById('check-solution');
const resetBtn = document.getElementById('reset');
const hintBtn = document.getElementById('hint');
const themeBtn = document.getElementById('theme');
const resetStatsBtn = document.getElementById('reset-stats');
const timerDisplay = document.getElementById('timer');
const puzzlesSolvedDisplay = document.getElementById('puzzles-solved');
const fastestTimeDisplay = document.getElementById('fastest-time');
const leaderboardList = document.getElementById('leaderboard-list');
const messageDisplay = document.getElementById('message');
const modal = document.getElementById('modal');
const confirmReset = document.getElementById('confirm-reset');
const cancelReset = document.getElementById('cancel-reset');

let board = [];
let solution = [];
let prefilled = [];
let timerInterval;
let startTime;
let stats = JSON.parse(localStorage.getItem('sudokuStats')) || {
    puzzlesSolved: 0,
    fastestTime: null,
    leaderboard: []
};

function initializeBoard() {
    board = Array(9).fill().map(() => Array(9).fill(0));
    solution = Array(9).fill().map(() => Array(9).fill(0));
    prefilled = Array(9).fill().map(() => Array(9).fill(false));
    generatePuzzle();
    renderBoard();
    startTimer();
}

function generatePuzzle() {
    fillBoard(solution);
    board = solution.map(row => [...row]);
    const difficulty = difficultySelect.value;
    const clues = { easy: 40, medium: 30, hard: 20 };
    removeNumbers(board, clues[difficulty]);
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            prefilled[i][j] = board[i][j] !== 0;
        }
    }
}

function fillBoard(grid) {
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (grid[row][col] === 0) {
                let nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
                for (let num of nums) {
                    if (isValid(grid, row, col, num)) {
                        grid[row][col] = num;
                        if (fillBoard(grid)) return true;
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValid(grid, row, col, num) {
    for (let x = 0; x < 9; x++) {
        if (grid[row][x] === num || grid[x][col] === num) return false;
    }
    let startRow = row - row % 3, startCol = col - col % 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (grid[i + startRow][j + startCol] === num) return false;
        }
    }
    return true;
}

function removeNumbers(grid, clues) {
    let cells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            cells.push([i, j]);
        }
    }
    cells = shuffle(cells);
    let removed = 0;
    for (let [row, col] of cells) {
        if (removed >= 81 - clues) break;
        let temp = grid[row][col];
        grid[row][col] = 0;
        if (countSolutions(grid) !== 1) {
            grid[row][col] = temp;
        } else {
            removed++;
        }
    }
}

function countSolutions(grid) {
    let temp = grid.map(row => [...row]);
    let solutions = 0;
    solve(temp, () => solutions++);
    return solutions;
}

function solve(grid, callback) {
    let row = 0, col = 0, found = false;
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (grid[i][j] === 0) {
                row = i;
                col = j;
                found = true;
                break;
            }
        }
        if (found) break;
    }
    if (!found) {
        callback();
        return;
    }
    for (let num = 1; num <= 9; num++) {
        if (isValid(grid, row, col, num)) {
            grid[row][col] = num;
            solve(grid, callback);
            grid[row][col] = 0;
        }
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderBoard() {
    grid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            let cell = document.createElement('input');
            cell.type = 'text';
            cell.className = 'cell';
            cell.readOnly = prefilled[i][j];
            cell.value = board[i][j] === 0 ? '' : board[i][j];
            cell.dataset.row = i;
            cell.dataset.col = j;
            if (prefilled[i][j]) {
                cell.classList.add('prefilled');
            }
            cell.addEventListener('input', handleInput);
            cell.addEventListener('keydown', handleKeydown);
            grid.appendChild(cell);
        }
    }
    updateFontStyle();
    validateBoard();
    console.log('Board rendered, editable cells should accept input.');
}

function handleInput(e) {
    const cell = e.target;
    if (cell.readOnly) {
        console.log('Input ignored: Cell is read-only.');
        return;
    }
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const value = cell.value.trim();

    console.log(`Input received at row ${row + 1}, col ${col + 1}: ${value}`);

    if (value === '' || /^[1-9]$/.test(value)) {
        board[row][col] = value === '' ? 0 : parseInt(value);
        cell.classList.remove('valid', 'invalid');
        if (value !== '' && isValid(board, row, col, board[row][col])) {
            cell.classList.add('valid');
            setTimeout(() => cell.classList.remove('valid'), 500);
            console.log(`Valid number ${value} entered at row ${row + 1}, col ${col + 1}`);
        }
        validateBoard();
        if (isBoardComplete()) {
            stopTimer();
            if (isBoardCorrect()) {
                stats.puzzlesSolved++;
                let time = Math.floor((Date.now() - startTime) / 1000);
                if (!stats.fastestTime || time < stats.fastestTime) {
                    stats.fastestTime = time;
                }
                stats.leaderboard.push({ time, date: new Date() });
                stats.leaderboard.sort((a, b) => a.time - b.time);
                stats.leaderboard = stats.leaderboard.slice(0, 5);
                localStorage.setItem('sudokuStats', JSON.stringify(stats));
                updateStats();
                messageDisplay.textContent = 'Puzzle Solved! Congratulations!';
                messageDisplay.style.color = '#2e7d32';
                setTimeout(() => messageDisplay.textContent = '', 3000);
            }
        }
    } else {
        cell.value = '';
        messageDisplay.textContent = `Invalid input at row ${row + 1}, column ${col + 1}! Use numbers 1-9.`;
        messageDisplay.style.color = '#d32f2f';
        console.log(`Invalid input at row ${row + 1}, col ${col + 1}: ${value}`);
    }
}

function handleKeydown(e) {
    const cell = e.target;
    if (cell.readOnly) {
        console.log('Keydown ignored: Cell is read-only.');
        return;
    }
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    console.log(`Keydown at row ${row + 1}, col ${col + 1}: ${e.key}`);

    if (e.key >= '1' && e.key <= '9') {
        cell.value = e.key;
        handleInput(e);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        cell.value = '';
        handleInput(e);
    } else if (e.key === 'ArrowUp' && row > 0) {
        const target = grid.children[(row - 1) * 9 + col];
        if (!target.readOnly) target.focus();
    } else if (e.key === 'ArrowDown' && row < 8) {
        const target = grid.children[(row + 1) * 9 + col];
        if (!target.readOnly) target.focus();
    } else if (e.key === 'ArrowLeft' && col > 0) {
        const target = grid.children[row * 9 + col - 1];
        if (!target.readOnly) target.focus();
    } else if (e.key === 'ArrowRight' && col < 8) {
        const target = grid.children[row * 9 + col + 1];
        if (!target.readOnly) target.focus();
    }
}

function validateBoard() {
    const cells = grid.children;
    let invalidCells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = cells[i * 9 + j];
            cell.classList.remove('invalid');
            if (board[i][j] !== 0 && !isValid(board, i, j, board[i][j])) {
                cell.classList.add('invalid');
                invalidCells.push(`row ${i + 1}, col ${j + 1}`);
            }
        }
    }
    if (invalidCells.length > 0) {
        messageDisplay.textContent = `Invalid numbers at: ${invalidCells.join('; ')}!`;
        messageDisplay.style.color = '#d32f2f';
    } else if (!messageDisplay.textContent.includes('Invalid input')) {
        messageDisplay.textContent = '';
    }
}

function checkSolution() {
    if (isBoardComplete() && isBoardCorrect()) {
        messageDisplay.textContent = 'Puzzle Solved! Congratulations!';
        messageDisplay.style.color = '#2e7d32';
        stopTimer();
        stats.puzzlesSolved++;
        let time = Math.floor((Date.now() - startTime) / 1000);
        if (!stats.fastestTime || time < stats.fastestTime) {
            stats.fastestTime = time;
        }
        stats.leaderboard.push({ time, date: new Date() });
        stats.leaderboard.sort((a, b) => a.time - b.time);
        stats.leaderboard = stats.leaderboard.slice(0, 5);
        localStorage.setItem('sudokuStats', JSON.stringify(stats));
        updateStats();
        setTimeout(() => messageDisplay.textContent = '', 3000);
    } else {
        messageDisplay.textContent = 'Puzzle is incomplete or incorrect!';
        messageDisplay.style.color = '#d32f2f';
        setTimeout(() => messageDisplay.textContent = '', 3000);
    }
}

function isBoardComplete() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) return false;
        }
    }
    return true;
}

function isBoardCorrect() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] !== solution[i][j]) return false;
        }
    }
    return true;
}

function startTimer() {
    startTime = Date.now();
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        let time = Math.floor((Date.now() - startTime) / 1000);
        let minutes = Math.floor(time / 60).toString().padStart(2, '0');
        let seconds = (time % 60).toString().padStart(2, '0');
        timerDisplay.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
}

function updateStats() {
    puzzlesSolvedDisplay.textContent = stats.puzzlesSolved;
    fastestTimeDisplay.textContent = stats.fastestTime
        ? `${Math.floor(stats.fastestTime / 60).toString().padStart(2, '0')}:${(stats.fastestTime % 60).toString().padStart(2, '0')}`
        : '--:--';
    leaderboardList.innerHTML = '';
    stats.leaderboard.forEach(entry => {
        let li = document.createElement('li');
        let time = `${Math.floor(entry.time / 60).toString().padStart(2, '0')}:${(entry.time % 60).toString().padStart(2, '0')}`;
        li.textContent = `${time} - ${new Date(entry.date).toLocaleDateString()}`;
        leaderboardList.appendChild(li);
    });
}

function provideHint() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (board[i][j] === 0) {
                board[i][j] = solution[i][j];
                let cell = grid.children[i * 9 + j];
                cell.value = solution[i][j];
                cell.classList.add('prefilled', 'hint');
                cell.readOnly = true;
                validateBoard();
                return;
            }
        }
    }
}

function updateFontStyle() {
    const cells = grid.children;
    for (let cell of cells) {
        cell.style.fontFamily = fontStyleSelect.value;
    }
}

difficultySelect.addEventListener('change', initializeBoard);
newGameBtn.addEventListener('click', initializeBoard);
checkSolutionBtn.addEventListener('click', checkSolution);
resetBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});
confirmReset.addEventListener('click', () => {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (!prefilled[i][j]) board[i][j] = 0;
        }
    }
    renderBoard();
    modal.style.display = 'none';
    startTimer();
});
cancelReset.addEventListener('click', () => {
    modal.style.display = 'none';
});
hintBtn.addEventListener('click', provideHint);
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('magic-mode');
});
fontStyleSelect.addEventListener('change', updateFontStyle);
resetStatsBtn.addEventListener('click', () => {
    stats = { puzzlesSolved: 0, fastestTime: null, leaderboard: [] };
    localStorage.setItem('sudokuStats', JSON.stringify(stats));
    updateStats();
    messageDisplay.textContent = 'Stats reset successfully!';
    messageDisplay.style.color = '#2e7d32';
    setTimeout(() => messageDisplay.textContent = '', 2000);
});

initializeBoard();
updateStats();