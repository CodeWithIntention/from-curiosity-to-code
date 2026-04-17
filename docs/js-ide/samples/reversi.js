const DEFAULT_BOARD_SIZE = 8;
const CELL_SIZE = 42;
const PLAYERS = [null, true, false];
const PLAYER_NAMES = {"null": "", "true": "Black", "false": "White"};
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
        --cell-color: #72bd55;
        --cell-selected-color:  #f5f5f5;
        --white-color: white;
        --black-color: black;
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
    }
    
    .piece {
      width: 80%;
      height: 80%;
      border-radius: 50%;
      cursor: pointer;
      transition: transform .4s ease;
      transform-style: preserve-3d;
    }
    
    .piece.black {
      background-color: black;
      cursor: default;
    }
    
    .piece.white {
      background-color: white;
      border: 1px solid #ccc; /* helps it stand out */
      cursor: default;
    }
    
    .piece.flipping {
      transform: rotateY(180deg);
    }
    </style>
</head>
<body>
  <div id="status"></div>
  <div id="board">
  </div>
  <div>
    <select id="levelSelect">
      <option value="6">6x6 Board</option>
      <option value="8" selected>8x8 Board</option>
      <option value="10">10x10 Board</opption>
    </select>
    <button id="resetGameBtn">Reset Game</button>
  </div>
</body>
</html>
`;

const gameWindow = window.open("", "", "width=500,height=530");
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
let squares = null;
let lastPlayerIndex = 0;

resetGame(Number(levelSelect.value));

function positionFromIndex(index) {
    const row = Math.floor(index / squares.length);
    const col = index % squares[0].length;
    return { index, row, col };
}

function positionFromRowCol(row, col) {
    const index = row * squares.length + col;
    return { index, row, col };
}

function onCellClicked(index) {
    const position = positionFromIndex(index);
    playTurn(position);
}

function playTurn(position) {
    const playerIndex = nextPlayerIndex();
    const player = PLAYERS[playerIndex];
    const opponentPieces = collectOpponentPieces(player, position);

    if (opponentPieces.length === 0) return;

    flipPieces(player, position, opponentPieces);
    lastPlayerIndex = playerIndex;

    let nextPlayer = PLAYERS[nextPlayerIndex()];
    if (canPlayTurn(nextPlayer)) {
        status.textContent += `\n${getPlayerName(nextPlayer)}'s turn.`;
        setTimeout(computerTurn, 500, nextPlayer);
    } else if (canPlayTurn(player)) {
        status.textContent += `'\n${getPlayerName(nextPlayer)} has no move. ${getPlayerName(player)} goes again.`;
        lastPlayerIndex = nextPlayerIndex();
        setTimeout(computerTurn, 550, player);
    } else {
        const winner = getWinningPlayerPieces();

        if (winner.player === PLAYERS[0]) {
            status.textContent = `No more moves left. It's a draw!`;
        } else {
            status.textContent = `No more moves left. ${getPlayerName(winner.player)} wins!`;
            winner.pieces.forEach((pos) => {
                // Trigger animation
                placePieceAt(winner.player, pos, true);
            });
        }
        board.classList.toggle("gameover", true);
    }
}

function computerTurn(player) {
    // Computer always plays White pieces
    if (player !== PLAYERS[2]) return;

    // Find the position with the move flips
    const bestPosition = findBestPosition(player);
    if (bestPosition) {
        playTurn(bestPosition);
    }
}

function flipPieces(player, position, opponentPieces) {
    placePieceAt(player, position);
    opponentPieces.forEach((pos) => placePieceAt(player, pos));
    
    const playerName = getPlayerName(player);
    const count = opponentPieces.length;
    status.textContent = `${playerName} flips ${count} ${count == 1 ? "piece" : "pieces"}.`;
}

function getPlayerName(player) {
    return PLAYER_NAMES[String(player)];
}

function nextPlayerIndex() {
    return lastPlayerIndex === 1 ? 2 : 1;
}

function getPlayerAtRowCol(row, col) {
    if (
        !(
            row >= 0 &&
            row < squares.length &&
            col >= 0 &&
            col < squares[0].length
        )
    )
        return false;

    return squares[row][col];
}

function placePieceAt(player, position, keepFlipping = false) {
    const cell = cells[position.index];
    const playerColor = player === PLAYERS[1] ? "black" : "white";

    squares[position.row][position.col] = player;
    cell.piece.classList.remove("flipping", "black", "white");
    cell.piece.classList.add("flipping", playerColor);
    
    if (keepFlipping) {
        setTimeout(() => {
            cell.piece.classList.remove("flipping");
        }, 250)
    }
}

function visitSquares(visitor) {
    for (let r = 0; r < squares.length; r++) {
        for (let c = 0; c < squares[0].length; c++) {
            if (visitor(positionFromRowCol(r, c)) === false) {
                return;
            }
        }
    }
}

function findBestPosition(player) {
    let bestPosition = null;
    let bestPiecesCount = 0;

    visitSquares((pos) => {
        const piecesCount = collectOpponentPieces(player, pos).length;

        if (piecesCount > 0 && bestPosition == null || piecesCount > bestPiecesCount) {
            bestPosition = pos;
            bestPiecesCount = piecesCount;
        }
    });

    return bestPosition;
}

function canPlayTurn(player) {
    let hasMoves = false;
    visitSquares((pos) => {
        hasMoves = collectOpponentPieces(player, pos).length > 0;
        return !hasMoves;
    });
    return hasMoves;
}

function getWinningPlayerPieces() {
    let blackPieces = [];
    let whitePieces = [];

    visitSquares((pos) => {
        const player = getPlayerAtRowCol(pos.row, pos.col);
        if (player === PLAYERS[1]) {
            blackPieces.push(pos);
        } else if (player === PLAYERS[2]) {
            whitePieces.push(pos);
        }
    });

    if (blackPieces.length === whitePieces.length) {
        return {player: PLAYERS[0]};
    }

    return blackPieces.length > whitePieces.length ? {player: PLAYERS[1], pieces: blackPieces} : 
        {player: PLAYERS[2], pieces: whitePieces};
}

function collectOpponentPieces(player, position, all = true) {
    const row = position.row;
    const col = position.col;

    // must be empty
    if (getPlayerAtRowCol(row, col) !== PLAYERS[0]) return [];

    const directions = [
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, -1],
        [0, 1],
        [1, -1],
        [1, 0],
        [1, 1],
    ];
    const opponent = player === PLAYERS[1] ? PLAYERS[2] : PLAYERS[1];
    let opponentPieces = [];

    for (const [dr, dc] of directions) {
        let r = row + dr;
        let c = col + dc;
        let foundOpponentPieces = [];

        // step in this direction
        while (
            r >= 0 &&
            r < squares.length &&
            c >= 0 &&
            c < squares[0].length
        ) {
            if (squares[r][c] === opponent) {
                foundOpponentPieces.push(positionFromRowCol(r, c));
            } else if (squares[r][c] === player) {
                // valid if we passed at least one opponent piece
                if (foundOpponentPieces.length > 0) {
                    if (all == false) return foundOpponentPieces;
                    opponentPieces.push(...foundOpponentPieces);
                }
                break;
            } else {
                // empty cell → stop
                break;
            }

            r += dr;
            c += dc;
        }
    }

    return opponentPieces;
}

function resetGame(size) {
    const rows = size || DEFAULT_BOARD_SIZE;
    const cols = size || DEFAULT_BOARD_SIZE;
    let divs = [];

    squares = [];
    lastPlayerIndex = 0;
    
    board.style.gridTemplateColumns = `repeat(${cols}, ${CELL_SIZE}px)`;
    board.style.gridTemplateRows = `repeat(${rows}, ${CELL_SIZE}px)`;
    board.classList.toggle("gameover", false);

    for (let row = 0; row < rows; row++) {
        squares.push([]);
        for (let col = 0; col < cols; col++) {
            squares[row].push(PLAYERS[0]);
            divs.push(`<div class="cell"><div class="piece"></div></div>`);
        }
    }

    board.innerHTML = divs.join("\n");
    status.textContent = "Let's play Reversi!";

    cells = Array.from(gameWindow.document.querySelectorAll(".cell"));
    cells.forEach((cell, index) => {
        cell.piece = cell.firstElementChild;
        cell.addEventListener("click", () => {
            onCellClicked(index);
        });
    });

    const middle = Math.floor(size/2);
    placePieceAt(PLAYERS[1], positionFromRowCol(middle-1, middle));
    placePieceAt(PLAYERS[1], positionFromRowCol(middle, middle-1));
    placePieceAt(PLAYERS[2], positionFromRowCol(middle-1, middle-1));
    placePieceAt(PLAYERS[2], positionFromRowCol(middle, middle));
}
