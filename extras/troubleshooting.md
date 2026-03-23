# Troubleshooting

## `python` command is not found

Try:

```bash
python3 --version
```

If that works, run programs with `python3` instead of `python`.

## The program crashes when I type letters

Use the Chapter 9 version of the game.
That version adds input validation before converting the input to an integer.

## My loop does not work

Check the indentation carefully.
In Python, indentation is part of the syntax.

## The program keeps saying my guess is wrong

Make sure you converted the user input to an integer in Version 3 and later:

```python
guess = int(user_input)
```

## The replay loop exits too soon

Check this line carefully:

```python
if input("Do you want to play again (y/n)? ") != "y":
```

Any input other than `y` will end the game in Version 7 and Version 8.
