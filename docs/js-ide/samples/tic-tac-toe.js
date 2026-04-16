const WINS = [[[1, 2], [3, 6], [4, 8]],
              [[0, 2], [4, 7]],
              [[0, 1], [5, 8], [4, 6]],
              [[0, 6], [4, 5]],
              [[1, 7], [3, 5], [0, 8], [2, 6]],
              [[2, 8], [3, 4]],
              [[0, 3], [7, 8], [2, 4]],
              [[1, 4], [6, 8]],
              [[6, 7], [2, 5], [0, 4]]];

const PLAYERS = ["", "X", "O"];

const GAME_PAGE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Tic-Tac-Toe</title>
  <style>
    :root {
        --columns:  repeat(3, 80px);
        --rows: repeat(3, 80px);
        --cell-font-size: 48px;
        --board-color: blue;
        --cell-color: white;
        --cell-selected-color: yellow;
        --cell-winner-color: lightgreen;
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
      gap: 4px;
    }

    #board.winner .cell {
        cursor: not-allowed;
    }
    
    #status {
      display: flex;
      justify-content: center;
      align-items: center;
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
        cursor: not-allowed;
    }
        
    .cell.winner {
        background-color: var(--cell-winner-color);
        cursor: not-allowed;
    }
    
  </style>
</head>
<body>
  <div id="status"></div>
  <div id="board">
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
    <div class="cell"></div>
  </div>
  <button id="resetGameBtn">Reset Game</button>
</body>
</html>
`;

const gameWindow = window.open("", "", "width=300,height=320");
if (!gameWindow) {
    alert("Please enable popups for this game to run.");
}

gameWindow.document.open();
gameWindow.document.write(GAME_PAGE_HTML);
gameWindow.document.close();

const status = gameWindow.document.getElementById("status");
const board = gameWindow.document.getElementById("board");
const resetGameBtn = gameWindow.document.getElementById("resetGameBtn");
const cells = Array.from(gameWindow.document.querySelectorAll(".cell"));

let lastPlayer = 0;
let isGameWon = false;

resetGameBtn.addEventListener("click", resetGame);

cells.forEach((cell, index) => {
    cell.addEventListener("click", () => {
        onCellClicked(index);
  });
});

resetGame();

function onCellClicked(index) {
    if (isGameWon) return;
    if (!playTurn(index)) return;
    
    let best = bestMove(nextPlayer());
    if (!best.win) {
        best = bestMove(lastPlayer);
    }
    if (best.index >= 0) {
        playTurn(best.index);
    }
}

function nextPlayer() {
    return lastPlayer == 1 ? 2 : 1;
}
    
function playTurn(index) {
    const cell = cells[index];
    if (cell.textContent !== PLAYERS[0]) return false;
    
    lastPlayer = nextPlayer();
    selectCell(cell);
    isGameWon = checkWinner(lastPlayer);
    
    if (isGameWon) {
        status.textContent = `${PLAYERS[lastPlayer]} wins!`;
        board.classList.toggle("winner", true);
    } else if (cells.find((cell) => cell.textContent === PLAYERS[0]) === undefined) {
        status.textContent = "It's a draw!";
    } else {
        status.textContent = "Your turn.";
    }
    return true;
}

function checkWinner(player) {
    for (const [index, cell] of cells.entries()) {
        if (cell.textContent === PLAYERS[player]) {
            const win = getWinIndex(player, index);
            
            if (win) {
                markWinCells(win);
                return true;
            }
        }
    }
    return false;
}

function markWinCells(win) {
    win.forEach((index) => selectCell(cells[index], true));
}
    
function bestMove(player) {
    let bestIndex = null;
    let win = null;
    
    for (const [index, cell] of cells.entries()) {
        if (cell.textContent === PLAYERS[0]) {
            win = getWinIndex(player, index);
            if (win) {
                bestIndex = index;
                break;
            } else if (bestIndex == null || WINS[index].length > WINS[bestIndex].length) {
                bestIndex = index;
            }
        }
    }
    return {index: bestIndex, win};
}

function getWinIndex(player, index) {
    const wins = WINS[index];
    let win = null;
    
    for (const moves of wins) {
        let occupied = 0;
        
        moves.forEach((index) => 
            {occupied += (cells[index].textContent === PLAYERS[player] ? 1 : 0)});
        
        if (occupied === moves.length) {
            win = moves;
            break;
        }
    }
    return win && [index, ...win] || null;
}

function selectCell(cell, winner = false) {
    if (winner === true) {
        cell.classList.toggle("winner", true);
    } else {
        cell.classList.toggle("selected", true);
    }
    cell.textContent = PLAYERS[lastPlayer];
}

function resetGame() {
    lastPlayer = 0;
    isGameWon = false;

    board.classList.toggle("winner", false);
    status.textContent = "Let's Play Tic-Tac-Toe. You go first!";
    
    cells.forEach((cell, index) => {
        cell.textContent = PLAYERS[0];
        cell.classList.toggle("selected", false);
        cell.classList.toggle("winner", false);
    });
}
