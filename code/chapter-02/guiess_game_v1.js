// Step 1: Welcome message
console.log("Welcome! Let's play the number guessing game.\nVersion 1\n");

// Step 2: Program selects secret number
let secret_number = "7";

// Step 3: Prompt user for a guess
let guess = await input("Guess a number from 1 to 10?");

// Step 4: Compare the user guess to the secret number
if (guess === secret_number) {
    console.log("You guessed it!"); // true: win message
} else {
    console.log("Wrong! You lose."); // false: lose message
}

// Step 5: End of game message
console.log("Goodbye.");
