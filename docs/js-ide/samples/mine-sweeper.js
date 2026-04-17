const DEFAULT_BOARD_SIZE = 20;
const CELL_SIZE = 21;

const COLORS = {
  1: "blue",
  2: "green",
  3: "red",
  4: "darkblue",
  5: "brown",
  6: "teal",
  7: "black",
  8: "gray"
};

const HTML_MINE = "&#128163;";
const HTML_SPACE = "&nbsp;";
const TEXT_FLAG = "🚩";
const GAME_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Mine Sweeper</title>
  <style>
    :root {
        --columns:  repeat(${DEFAULT_BOARD_SIZE}, ${CELL_SIZE}px);
        --rows: repeat(${DEFAULT_BOARD_SIZE}, ${CELL_SIZE}px);
        --cell-font-size: 12px;
        --board-color: rgb(38, 3, 63);
        --status-color: white;
        --cell-color: lightgray;
        --cell-selected-color:  #f5f5f5;
        --cell-mine-color: #ff6b6b;
        --mine-color: white;
    }
    
    body {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      gap: 8px;
    }

    #board {
      display: grid;
      grid-template-columns: var(--columns);
      grid-template-rows: var(--rows);
      background-color: var(--board-color);
      padding: 2px;
      gap: 1px;
    }

    #board.gameover .cell {
        cursor: not-allowed;
    }
    
    #status {
      background-color: var(--board-color);
      color: var(--status-color);
      padding: 8px;
    }
    
    .cell {
      border: 1px solid black;
      display: flex;
      justify-content: center;
      align-items: center;
      font-size: var(--cell-font-size);
      background-color: var(--cell-color);
      cursor: pointer;
    }
    
    .cell.selected {
        background-color: var(--cell-selected-color);
        cursor: default;
        font-weight: bold;
    }
        
    .cell.mine {
        background-color: var(--cell-mine-color);
        cursor: not-allowed;
    }
  </style>
</head>
<body>
  <div id="status"></div>
  <div id="board">
  </div>
  <div>
    <select id="levelSelect">
        <option value="10" selected>Easy</option>
        <option value="20">Difficult</option>
        <option value="30">Insane</option>
    </select>
    <button id="resetGameBtn">Reset Game</button>
  </div>
</body>
</html>
`;

const gameWindow = window.open("", "", "width=750,height=780");
if (!gameWindow) {
    alert("Please enable popups for this game to run.");
}

gameWindow.document.open();
gameWindow.document.write(GAME_PAGE_HTML);
gameWindow.document.close();

const status = gameWindow.document.getElementById("status");
const board = gameWindow.document.getElementById("board");
const levelSelect = gameWindow.document.getElementById("levelSelect");
const resetGameBtn = gameWindow.document.getElementById("resetGameBtn");

resetGameBtn.addEventListener("click", () => resetGame(Number(levelSelect.value)));
levelSelect.addEventListener("change", () => resetGame(Number(levelSelect.value)));

let cells = null;
let mineField = null;
let visitedCells = null;
let totalMines = null;
let minesSteppedOn = null;

resetGame(Number(levelSelect.value));

function positionFromIndex(index) {
    const row = Math.floor(index/mineField.length);
    const col = index % mineField[0].length;
    return {index, row, col};
}

function positionFromRowCol(row, col) {
    const index = row * mineField.length + col;
    return {index, row, col};
}

function onCellClicked(index, flag = false) {
    if (totalMines > 0 && minesSteppedOn === totalMines) return;
    const position = positionFromIndex(index);
    
    selectCellAtPosition(position, flag);
    
    if (visitedCells === cells.length-totalMines) {
        if (minesSteppedOn == 0) {
            if (totalMines > 0) {
                status.textContent = `Congratulations! You've identified all ${totalMines} mines!`;
            } else {
                status.textContent = `That was too easy!`;
            }
        } else {
            status.textContent = `You found all ${totalMines} mines! Unfortunately you stepped on ${minesSteppedOn} of them.`
        }
        showRemainingMines();
    } else if (minesSteppedOn === totalMines) {
        board.classList.toggle("gameover", true);
        status.textContent = `Game over man! You stepped on all ${minesSteppedOn} mines!`
    }
}

function showRemainingMines() {
    cells.forEach((cell, index) => {
        if (!cell.textContent) {
            const position = positionFromIndex(index);
            if (hasMineAt(position.row, position.col)) {
                cell.innerHTML = HTML_MINE;
            }
        }
    });
}

function selectCellAtPosition(position, flag = false) {
    const cell = cells[position.index];
    if (flag) {
        console.log(cell.textContent);
      if (cell.textContent === "") {
        cell.textContent = TEXT_FLAG;
      } else if (cell.textContent === TEXT_FLAG) {
        cell.textContent = "";
      }
      return;
    }        
    if (cell.textContent !== "") return;
    
    if (hasMineAt(position.row, position.col)) {
        minesSteppedOn++;
        
        cell.classList.toggle("mine", true);
        cell.innerHTML = HTML_MINE;
        
        if (minesSteppedOn === 1) {
            status.textContent = "Oh snaps! You stepped on a mine!";
        } else {
            status.textContent = `Kaboom! You stepped on ${minesSteppedOn} mines so far!`;
        }
    } else {
        const mines = countAdjacentMines(position);
        cell.classList.toggle("selected", true);
        visitedCells++;
        
        if (mines > 0) {
            cell.textContent = String(mines);
            cell.style.color = getColor(mines);
        } else {
            cell.innerHTML = HTML_SPACE;
            visitAdjacentCells(position, (row, col) => {
                selectCellAtPosition(positionFromRowCol(row, col));
            });
        }
        status.textContent = `Becareful!`;
    }
}

function getColor(count) {
  return COLORS[count] || "black";
}

function countAdjacentMines(position) {
    let count = 0;

    visitAdjacentCells(position, (row, col) => {
        if (hasMineAt(row, col)) {
            count++;
        }
    });
    return count;
}

function visitAdjacentCells(position, visitor) {
    for (let row = position.row-1; row <= position.row+1; row++) {
        if (row < 0 || row >= mineField.length) continue;
        
        for (let col = position.col-1; col <= position.col+1; col++) {
            if (col < 0 || col >= mineField[0].length) continue;

            if (row != position.row || col != position.col) {
                visitor(row, col);
            }
        }
    }
}

function hasMineAt(row, col) {
    if (!(row >= 0 && row < mineField.length && col >= 0 && col < mineField[0].length)) return false;
    
    return mineField[row][col];
}

function shouldPlaceMine(size) {
    const percent = Math.min(Math.min(size/100, .25), .35);
    return Math.random() <= percent;
}

function resetGame(size) {
    const rows = size || DEFAULT_BOARD_SIZE;
    const cols = size || DEFAULT_BOARD_SIZE;
    let divs = [];
    
    mineField = [];
    totalMines = 0;
    minesSteppedOn = 0;
    visitedCells = 0;
    
    board.style.gridTemplateColumns = `repeat(${cols}, ${CELL_SIZE}px)`;
    board.style.gridTemplateRows = `repeat(${rows}, ${CELL_SIZE}px)`;
    board.classList.toggle("gameover", false);
    
    for (let row = 0; row < rows; row++) {
        mineField.push([]);
        for (let col = 0; col < cols; col++) {
            const mine = shouldPlaceMine(size);
            if (mine) {
                totalMines++;
            }
            mineField[row].push(mine);
            divs.push(`<div class="cell"></div>`);
        }
    }
    
    board.innerHTML = divs.join("\n");
    status.textContent = "Let's play Mine Sweeper. Good luck!";

    cells = Array.from(gameWindow.document.querySelectorAll(".cell"));
    cells.forEach((cell, index) => {
        cell.addEventListener("click", () => {
            onCellClicked(index);
        });
        cell.addEventListener("contextmenu", (event) => {
            event.preventDefault();
            onCellClicked(index, true);
        });
    });
}
