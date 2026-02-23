import argparse

def parse_aws_account_id_from_args():
    parser = argparse.ArgumentParser(description='Invoke charging-stations-health Lambda')
    parser.add_argument(
        'account_id',
        nargs='?',
        default=None,
        help='AWS account ID where the Lambda is deployed',
    )
    parser.add_argument(
        '--account', '-a',
        dest='account_id_opt',
        default=None,
        help='AWS account ID (alternative to positional)',
    )
    args = parser.parse_args()
    account_id = args.account_id or args.account_id_opt
    if not account_id:
        parser.error('AWS account ID required: pass it as argument or use --account option')
    return account_id