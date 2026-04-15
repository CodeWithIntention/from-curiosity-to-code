console.log("Welcome! Let's play the number guessing game.\nVersion 3\n");

// Secret number is now stored as a Number
let secret_number = Math.floor(Math.random() * 10) + 1;
let guess = null;

// Game loop
while (guess !== secret_number) {
    // Store user input as a String
    let user_input = await input("Guess a number from 1 to 10?");
    
    // Convert String to Number for comparison
    guess = Number(user_input);
    
    if (guess === secret_number) {
        console.log("You guessed it!");
    } else {
        console.log("Wrong! Guess again.");
    }
}

console.log("Goodbye.");
