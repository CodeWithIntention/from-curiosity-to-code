import random

print("Welcome! Let's play the number guessing game.\nVersion 3\n")

# Secret number is now stored as an integer
secret_number = random.randint(1, 10)
guess = None

# Game loop
while guess != secret_number:
    # Store user input as a string
    user_input = input("Guess a number from 1 to 10? ")

    # Convert string to int for comparison
    guess = int(user_input)

    if guess == secret_number:
        print("You guessed it!")
    else:
        print("Wrong! Guess again.")

print("Goodbye.")
