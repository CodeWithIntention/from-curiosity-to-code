# Step 1: Welcome message
print("Welcome! Let's play the number guessing game.\nVersion 1\n")

# Step 2: Program selects secret number
secret_number = "7"

# Step 3: Prompt user for a guess
guess = input("Guess a number from 1 to 10? ")

# Step 4: Compare the user guess to the secret number
if guess == secret_number:
    print("You guessed it!")  # True: win message
else:
    print("Wrong! You lose.")  # False: lose message

# Step 5: End of game message
print("Goodbye.")
