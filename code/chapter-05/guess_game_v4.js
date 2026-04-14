const MIN_NUMBER = 1;
const MAX_NUMBER = 10;

console.log("Welcome! Let's play the number guessing game.\nVersion 4\n");

let secret_number = Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER;
let guess = null;

// Game loop
while (guess !== secret_number) {
    let user_input = await input(`Guess a number from ${MIN_NUMBER} to ${MAX_NUMBER}?`);
    guess = Number(user_input);
    
    if (guess === secret_number) {
        console.log("You guessed it!");
    } else {
        console.log("Wrong! Guess again.");
    }
}

console.log("Goodbye.");
