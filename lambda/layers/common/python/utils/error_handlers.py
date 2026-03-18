class LambdaResponseError(Exception):
    """Raise to signal failure but return a structured dict to the caller."""
    def __init__(self, response: dict):
        self.response = response
        super().__init__(response.get("error"), response.get("code"))