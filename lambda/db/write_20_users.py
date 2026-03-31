import boto3
import random
import sys
import json

# Инициализация клиента Cognito
client = boto3.client('cognito-idp', region_name='il-central-1')

NUM_USERS = 20
NAME_PREFIX = ["John", "Jane", "Jim", "Jill", "Jack", "Jill", "Jim", "Jane", "John", "Jim"]
NAME_SUFFIX = ["Snow", "Doe", "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis"]


def main(user_pool_id: str) -> dict:
    for i in range(1, NUM_USERS + 1):
        user_num = f"{i:03d}"
        username = f"user-{user_num}@test.com"
        name = f'{random.choice(NAME_PREFIX)} {random.choice(NAME_SUFFIX)}'
        try:
            response = client.admin_create_user(
                UserPoolId=user_pool_id,
                Username=username,
                UserAttributes=[
                    {'Name': 'email', 'Value': username},
                    {'Name': 'email_verified', 'Value': 'true'},
                    {'Name': 'name', 'Value': name}
                ],
                MessageAction='SUPPRESS'
            )
            raw = response["Payload"].read().decode()
            response_json = json.loads(raw)
            if response_json.get("error"):
                print(f"Ошибка при создании {username}: {response_json.get('error')}")
                return None
            print(f"Успешно создан: {username}")
            return response_json
        except client.exceptions.UsernameExistsException:
            print(f"Пропуск: Пользователь {username} уже существует")
            return None
        except Exception as e:
            print(f"Ошибка при создании {username}: {str(e)}")
            raise

if __name__ == "__main__":
    args = sys.argv[1:]
    if len(args) != 1:
        print("Usage: python write_20_users.py <user_pool_id>")
        sys.exit(1)
    user_pool_id = args[0]
    response = main(user_pool_id)
    print(json.dumps(response, indent=4))