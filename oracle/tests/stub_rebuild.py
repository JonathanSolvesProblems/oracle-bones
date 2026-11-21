"""A stand-in rebuild for the comparator tests (oracle-harness task 8.2, Property 10).

  stub_rebuild.py <answers.json> answer         answer every request from the file
  stub_rebuild.py <answers.json> crash <k>      answer k requests, then exit with code 1
  stub_rebuild.py <answers.json> hang <k>       answer k requests, then never answer or exit
  stub_rebuild.py <answers.json> badjson <k>    answer k requests, print a line that is not
                                                JSON, then answer the rest
  stub_rebuild.py <answers.json> unknown <k>    answer k requests, then answer an id nobody asked

answers.json maps a case id to {"outcome", "printed", "message"}.
"""
import json
import sys
import time


def main():
    answers = json.load(open(sys.argv[1], encoding="utf-8"))
    mode = sys.argv[2]
    k = int(sys.argv[3]) if len(sys.argv) > 3 else None
    requests = [json.loads(line) for line in sys.stdin if line.strip()]
    sys.stderr.write("stub got %d requests\n" % len(requests))
    for i, req in enumerate(requests):
        if k is not None and i == k:
            if mode == "crash":
                sys.exit(1)
            if mode == "hang":
                sys.stdout.flush()
                time.sleep(3600)
            if mode == "badjson":
                print("this is not json", flush=True)
            if mode == "unknown":
                print(json.dumps({"id": "nobody-asked", "outcome": "result", "printed": {}, "message": None}),
                      flush=True)
        a = answers[req["id"]]
        print(json.dumps({"id": req["id"], "outcome": a["outcome"], "printed": a["printed"],
                          "message": a.get("message")}), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
