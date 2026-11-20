"""A stand-in for a dead program, run in the pty in place of emu2 (Properties 5 and 6).

  stub_target.py form <seed> <n>      show PROMPT 1..n, each after a random delay; input that
                                      arrives before its prompt is thrown away and logged
  stub_target.py menu <k> <resend>    show MENU (or OTHER when resend is "no"); ignore the
                                      first k keys, then show DONE

Every event goes to /drive/stub.log, one per line.
"""

import os
import random
import select
import sys
import termios
import time
import tty

LOG = open("/drive/stub.log", "w", buffering=1)


def show(text):
    sys.stdout.write("\x1b[2J\x1b[H" + text)
    sys.stdout.flush()


def pending():
    return bool(select.select([sys.stdin], [], [], 0)[0])


def form(seed, n):
    rnd = random.Random(seed)
    got = []
    show("FORM\r\n")
    for i in range(1, n + 1):
        time.sleep(rnd.uniform(0, 0.3))
        if pending():
            LOG.write("early %d\n" % i)
        termios.tcflush(sys.stdin, termios.TCIFLUSH)  # input sent before the prompt is lost
        show("FORM\r\nPROMPT %d\r\n" % i)
        line = sys.stdin.readline().strip()
        LOG.write("got %d %s\n" % (i, line))
        got.append(line)
    show("FORM\r\nGOT %s\r\n" % ",".join(got))
    time.sleep(60)


def menu(k, resend):
    tty.setraw(sys.stdin.fileno())
    label = "MENU" if resend == "yes" else "OTHER"
    show(label + "\r\n")
    seen = 0
    while True:
        ch = os.read(sys.stdin.fileno(), 1)
        seen += 1
        LOG.write("key %d %r\n" % (seen, ch))
        if seen > k:
            show("DONE\r\n")
            time.sleep(60)
            return


if __name__ == "__main__":
    if sys.argv[1] == "form":
        form(int(sys.argv[2]), int(sys.argv[3]))
    else:
        menu(int(sys.argv[2]), sys.argv[3])
