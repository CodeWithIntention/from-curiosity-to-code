print("Welcome! Let's play the number guessing game.\nVersion 2\n")

secret_number = "7"
guess = None

# Game loop
while guess != secret_number:
    guess = input("Guess a number from 1 to 10? ")

    if guess == secret_number:
        print("You guessed it!")
    else:
        print("Wrong! Guess again.")

print("Goodbye.")
