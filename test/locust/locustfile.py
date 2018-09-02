from locust import HttpLocust, TaskSet, task
import random

class UserBehavior(TaskSet):
  @task(1)
  def index(self):
    self.client.get("/foo")

class WebsiteUser(HttpLocust):
  task_set = UserBehavior
  # How long a simulated user should wait between requests.
  wait_function = lambda self: random.expovariate(1)*100