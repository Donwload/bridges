class SolutionChecker {
    constructor(logic) {
        this.logic = logic;
    }

    countSolutions(maxSolutions = 2) {
        const logic = this.logic;

        if (
            !Number.isInteger(maxSolutions) ||
            maxSolutions < 1 ||
            logic.islands.size === 0
        ) {
            return 0;
        }

        const islandKeys = [...logic.islands.keys()];
        const edges = [];

        // Собираем все возможные рёбра между соседними островами.
        for (let i = 0; i < islandKeys.length; i++) {
            const [r1, c1] = islandKeys[i].split(',').map(Number);

            for (let j = i + 1; j < islandKeys.length; j++) {
                const [r2, c2] = islandKeys[j].split(',').map(Number);

                const i1 = [r1, c1];
                const i2 = [r2, c2];

                if (!logic.areIslandsNeighbors(i1, i2)) {
                    continue;
                }

                edges.push({
                    i1,
                    i2,
                    key: logic.getEdgeKey(i1, i2),
                    k1: islandKeys[i],
                    k2: islandKeys[j]
                });
            }
        }

        if (edges.length === 0 && islandKeys.length > 1) {
            return 0;
        }

        const degree = new Map(
            islandKeys.map(key => [key, 0])
        );

        const solutionBridges = new Map();
        let solutions = 0;

        const search = (index) => {
            if (solutions >= maxSolutions) {
                return;
            }

            if (index === edges.length) {
                for (const key of islandKeys) {
                    if (degree.get(key) !== logic.islands.get(key)) {
                        return;
                    }
                }

                if (!this.isSolutionConnected(solutionBridges, islandKeys)) {
                    return;
                }

                solutions++;
                return;
            }

            const edge = edges[index];

            const target1 = logic.islands.get(edge.k1);
            const target2 = logic.islands.get(edge.k2);

            const current1 = degree.get(edge.k1);
            const current2 = degree.get(edge.k2);

            for (let count = 0; count <= 2; count++) {
                const next1 = current1 + count;
                const next2 = current2 + count;

                if (next1 > target1 || next2 > target2) {
                    continue;
                }

                if (
                    count > 0 &&
                    logic.hasIntersection(
                        edge.i1,
                        edge.i2,
                        solutionBridges
                    )
                ) {
                    continue;
                }

                if (count > 0) {
                    solutionBridges.set(edge.key, count);
                }

                degree.set(edge.k1, next1);
                degree.set(edge.k2, next2);

                let possible = true;
                const remainingCapacity = new Map(
                    islandKeys.map(key => [key, 0])
                );

                for (let k = index + 1; k < edges.length; k++) {
                    const future = edges[k];

                    remainingCapacity.set(
                        future.k1,
                        remainingCapacity.get(future.k1) + 2
                    );

                    remainingCapacity.set(
                        future.k2,
                        remainingCapacity.get(future.k2) + 2
                    );
                }

                for (const key of islandKeys) {
                    const remaining =
                        logic.islands.get(key) - degree.get(key);

                    if (
                        remaining < 0 ||
                        remaining > remainingCapacity.get(key)
                    ) {
                        possible = false;
                        break;
                    }
                }

                if (possible) {
                    search(index + 1);
                }

                degree.set(edge.k1, current1);
                degree.set(edge.k2, current2);

                if (count > 0) {
                    solutionBridges.delete(edge.key);
                }

                if (solutions >= maxSolutions) {
                    return;
                }
            }
        };

        search(0);

        return solutions;
    }

    isSolutionConnected(solutionBridges, islandKeys) {
        if (islandKeys.length === 0) {
            return false;
        }

        const adjacency = new Map(
            islandKeys.map(key => [key, []])
        );

        for (const [edgeKey, count] of solutionBridges.entries()) {
            if (
                !Number.isInteger(count) ||
                count < 1 ||
                count > 2
            ) {
                return false;
            }

            const parts = edgeKey.split('-');

            if (parts.length !== 2) {
                return false;
            }

            const [k1, k2] = parts;

            if (!adjacency.has(k1) || !adjacency.has(k2)) {
                return false;
            }

            adjacency.get(k1).push(k2);
            adjacency.get(k2).push(k1);
        }

        const visited = new Set([islandKeys[0]]);
        const queue = [islandKeys[0]];

        for (let index = 0; index < queue.length; index++) {
            const current = queue[index];

            for (const neighbor of adjacency.get(current)) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push(neighbor);
                }
            }
        }

        return visited.size === islandKeys.length;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SolutionChecker;
}
