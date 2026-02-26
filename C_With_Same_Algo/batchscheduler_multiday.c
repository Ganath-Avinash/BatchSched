#include <stdio.h>
#include <stdlib.h>

#define MAX 1000

struct Job {
    int id;
    int compute;
    int deadline;
};

int globalID = 1;   


void merge(struct Job arr[], int left, int mid, int right) {
    int i, j, k;
    int n1 = mid - left + 1;
    int n2 = right - mid;

    struct Job L[n1], R[n2];

    for (i = 0; i < n1; i++)
        L[i] = arr[left + i];

    for (j = 0; j < n2; j++)
        R[j] = arr[mid + 1 + j];

    i = 0; j = 0; k = left;

    while (i < n1 && j < n2) {

        if (L[i].deadline < R[j].deadline)
            arr[k++] = L[i++];

        else if (L[i].deadline > R[j].deadline)
            arr[k++] = R[j++];

        else {
            if (L[i].compute <= R[j].compute)
                arr[k++] = L[i++];
            else
                arr[k++] = R[j++];
        }
    }

    while (i < n1)
        arr[k++] = L[i++];

    while (j < n2)
        arr[k++] = R[j++];
}

void mergeSort(struct Job arr[], int left, int right) {
    if (left < right) {
        int mid = (left + right) / 2;
        mergeSort(arr, left, mid);
        mergeSort(arr, mid + 1, right);
        merge(arr, left, mid, right);
    }
}

int removeExpiredJobs(struct Job jobs[], int n, int today) {
    int count = 0;

    for (int i = 0; i < n; i++) {
        if (jobs[i].deadline >= today) {
            jobs[count++] = jobs[i];   // shift valid jobs forward
        }
    }

    return count;
}

int calculateTotalCompute(struct Job selected[], int count) {
    int total = 0;
    for (int i = 0; i < count; i++)
        total += selected[i].compute;
    return total;
}

void printJobs(struct Job jobs[], int count, char title[]) {
    printf("\n%s\n", title);
    printf("---------------------------------\n");
    for (int i = 0; i < count; i++) {
        printf("Job %d | Compute: %d | Deadline: %d\n",
               jobs[i].id, jobs[i].compute, jobs[i].deadline);
    }
    if (count == 0)
        printf("None\n");
}


int main() {

    struct Job backlog[MAX]; 
    int backlogCount = 0;

    int day = 1;
    int choice = 1;

    while (choice) {

        printf("\n=================================\n");
        printf("DAY %d\n", day);
        printf("=================================\n");

        int newJobs;
        printf("Enter number of new jobs today: ");
        scanf("%d", &newJobs);

        // Add new jobs to backlog
        for (int i = 0; i < newJobs; i++) {
            backlog[backlogCount].id = globalID++;
            printf("Enter compute and deadline: ");
            scanf("%d %d",
                  &backlog[backlogCount].compute,
                  &backlog[backlogCount].deadline);
            backlogCount++;
        }

        int N;
        printf("Enter number of jobs to execute today: ");
        scanf("%d", &N);

        // Step 1: Remove expired jobs
        int beforeRemoval = backlogCount;
        backlogCount = removeExpiredJobs(backlog, backlogCount, day);
        int expired = beforeRemoval - backlogCount;

        // Step 2: Sort remaining jobs
        if (backlogCount > 0)
            mergeSort(backlog, 0, backlogCount - 1);

        // Step 3: Select first N jobs
        struct Job selected[MAX];
        int selectedCount = 0;

        for (int i = 0; i < backlogCount && selectedCount < N; i++)
            selected[selectedCount++] = backlog[i];

        // Step 4: Remove selected jobs from backlog
        for (int i = selectedCount; i < backlogCount; i++)
            backlog[i - selectedCount] = backlog[i];

        backlogCount -= selectedCount;

        // Step 5: Metrics
        int totalCompute = calculateTotalCompute(selected, selectedCount);

        printJobs(selected, selectedCount, "Executed Jobs");
        printJobs(backlog, backlogCount, "Remaining Backlog");

        printf("\nTotal Compute Today: %d\n", totalCompute);
        printf("Expired Jobs Today: %d\n", expired);
        printf("Backlog Size End of Day: %d\n", backlogCount);

        printf("\nContinue to next day? (1 = Yes / 0 = Exit): ");
        scanf("%d", &choice);

        day++;
    }

    printf("\nSystem Stopped.\n");
    return 0;
}