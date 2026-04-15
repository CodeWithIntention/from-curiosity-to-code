console.log("Welcome! Let's play the number guessing game.\nVersion 2\n");

let secret_number = "7";
let guess = null;

// Game loop
while (guess !== secret_number) {
    // Reassign guess to the user's input
    guess = await input("Guess a number from 1 to 10?");
    
    if (guess === secret_number) {
        console.log("You guessed it!");
    } else {
        console.log("Wrong! Guess again.");
    }
}

console.log("Goodbye.");
