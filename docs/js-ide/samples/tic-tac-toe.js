/*
    Map of the 9 cells the corresponding cells 
    to make a win.
*/
const WINS = [[[1, 2], [3, 6], [4, 8]],
              [[0, 2], [4, 7]],
              [[0, 1], [5, 8], [4, 6]],
              [[0, 6], [4, 5]],
              [[1, 7], [3, 5], [0, 8], [2, 6]],
              [[2, 8], [3, 4]],
              [[0, 3], [7, 8], [2, 4]],
              [[1, 4], [6, 8]],
              [[6, 7], [2, 5], [0, 4]]];

// Used for the selection state of each cell
const PLAYERS = ["", "X", "O"];

// HTML for the game page: Displays a 3x3 grid.
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
        --board-color: rgb(38, 3, 63);
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
      background-color: var(--board-color);
      color: var(--cell-color);
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

// Open a blank HTML page in new window
const gameWindow = window.open("", "", "width=300,height=330");
if (!gameWindow) {
    alert("Please enable pop-ups for this game to run.");
}

// Write HTML for the game to the window
gameWindow.document.open();
gameWindow.document.write(GAME_PAGE_HTML);
gameWindow.document.close();

// These are the elements on the HTML page used for the game
const status = gameWindow.document.getElementById("status");
const board = gameWindow.document.getElementById("board");
const resetGameBtn = gameWindow.document.getElementById("resetGameBtn");
const cells = Array.from(gameWindow.document.querySelectorAll(".cell"));

/*
    This is the current player:
    0: Start of game, wait for X Player
    1: X Player
    2: O Player
*/
let currentPlayer = 0;

/*
    Game flag:
    true: Game over
    false: Game is progress
*/
let isGameOver = false;

// Resets the game when clicked
resetGameBtn.addEventListener("click", resetGame);

// Listen to mouse click for each cell
cells.forEach((cell, index) => {
    cell.addEventListener("click", () => {
        onCellClicked(index);
  });
});

// Start a new game
resetGame();

// Handles cell click to play a turn
function onCellClicked(index) {
    /*
        X Player's turn. If false
        then the game is over or it
        was not a legal turn.
    */
    if (!playTurn(index)) return;

    // Next player is the computer
    const computerPlayer = nextPlayer();
    
    // Find the best move
    let best = bestMove(computerPlayer);
    
    /*
        If the move is not a win then take
        the current player's best move to block.
    */
    if (!best.win) {
        best = bestMove(currentPlayer);
    }

    // Play the turn if there is a legal move.
    if (best.index >= 0) {
        playTurn(best.index);
    }
}

// Alternate between X (1) and O (2) player
function nextPlayer() {
    return currentPlayer == 1 ? 2 : 1;
}

// Play a turn for the current player    
function playTurn(index) {
    if (isGameOver) return false;

    // The cell (box) must be unoccuppied
    const cell = cells[index];
    if (cell.textContent !== PLAYERS[0]) return false;
    
    // Get the current player
    currentPlayer = nextPlayer();
    
    // Select the cell
    selectCell(currentPlayer, cell);

    // Check if all winning cells were selected
    if (checkWinner(currentPlayer)) {
        status.textContent = `${PLAYERS[currentPlayer]} wins!`;
        board.classList.toggle("winner", true);
        isGameOver = true;
    // It's a draw when all cells are occupied
    } else if (cells.find((cell) => cell.textContent === PLAYERS[0]) === undefined) {
        status.textContent = "It's a draw!";
        isGameOver = true;
    } else {
        status.textContent = "Your turn.";
    }
    // Return true if there is another turn
    return !isGameOver;
}

/*
    Check each player occupied cell to see if all
    winning cells are selected.
*/
function checkWinner(player) {
    for (const [index, cell] of cells.entries()) {
        if (cell.textContent === PLAYERS[player]) {
            const win = getWinIndex(player, index);
            
            if (win) {
                markWinCells(player, win);
                return true;
            }
        }
    }
    return false;
}

// Mark player's winning cells
function markWinCells(player, win) {
    win.forEach((index) => selectCell(player, cells[index], true));
}
    
// Pick the best move and determine if the move is a win
function bestMove(player) {
    let bestIndex = null;
    let win = null;
    
    for (const [index, cell] of cells.entries()) {
        // Check for unoccupied cell
        if (cell.textContent === PLAYERS[0]) {
            win = getWinIndex(player, index);

            // Test if player has the winning cell
            if (win) {
                bestIndex = index;
                break;
            // Otherwise pick the cell with the highest potential for winning turns
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
        
        // Player occupies all winning cells
        if (occupied === moves.length) {
            win = moves;
            break;
        }
    }
    return win && [index, ...win] || null;
}

function selectCell(player, cell, winner = false) {
    if (winner === true) {
        cell.classList.toggle("winner", true);
    } else {
        cell.classList.toggle("selected", true);
    }
    cell.textContent = PLAYERS[player];
}

function resetGame() {
    currentPlayer = 0;
    isGameOver = false;

    board.classList.toggle("winner", false);
    status.textContent = "Let's Play Tic-Tac-Toe. You go first!";
    
    cells.forEach((cell, index) => {
        cell.textContent = PLAYERS[0];
        cell.classList.remove("selected", "winner");
    });
}
